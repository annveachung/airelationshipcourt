# Phase 3 — Case & Testimony

## 1. Goal

A couple can file a case, and each partner can privately submit their side. The backend enforces the case lifecycle and — crucially — guarantees one partner can never read the other's testimony early. When both have submitted, the case moves on to `ANALYSIS` and the waiting screen shows it. No AI yet; the case simply parks at `ANALYSIS`.

## 2. Prerequisites

- Phases 1–2 complete and two paired accounts available for testing.
- Add `SUPABASE_SERVICE_ROLE_KEY` to `.env.local` (Supabase → Project Settings → API). This key bypasses all security rules — treat it like a password: never prefix it `NEXT_PUBLIC_`, never import it into a page or component.
- Read `node_modules/next/dist/docs/01-app/01-getting-started/07-mutating-data.md` and `02-guides/forms.md`.

## 3. What gets built

**Database** — `supabase/migrations/0002_cases_and_testimony.sql`
- Enum `case_stage`: `CASE_OPEN, TESTIMONY, ANALYSIS, FOLLOW_UP, PANEL_JUDGEMENT, VERDICT, RECOMMENDATIONS, REPORT, CLOSED`. **Declared in this order** — Postgres enums compare by declaration order, so `stage >= 'VERDICT'` works directly in security policies.
- `cases` — `couple_id`, `created_by`, `title`, optional `context`, `stage` (default `TESTIMONY`), `stage_entered_at`, `last_error`, `closed_at`.
- `testimonies` — the six answers per partner: `what_happened`, `emotions` (a text array), `emotions_note`, `what_caused_it`, `severity` (1–10, checked), `wanted_instead`, `partner_did_wrong`. **`UNIQUE (case_id, user_id)`** — one testimony each, enforced by the database.
- Row Level Security:
  - `cases`: members of the couple can read; members can create; **no update policy** (only the state machine, using the service role, changes a stage).
  - `testimonies`: you can always read **your own**; you can read your partner's only if you're in the couple **and** the case `stage >= 'VERDICT'`. Insert allowed for yourself only. **No update or delete policy** — testimony is final once submitted.

**Server logic** (`lib/`)
- `lib/supabase/service.ts` — the service-role client. Header comment: *"Server only. Bypasses Row Level Security. Never import from a page or component."*
- `lib/cases/state-machine.ts` — the only code allowed to change `cases.stage`. Contains the allowed-transitions map and one function, `transition(caseId, from, to)`, implemented as a compare-and-swap: `UPDATE cases SET stage = to … WHERE id = … AND stage = from`. Zero rows updated means someone else already advanced it — that's normal, not an error.
- `lib/cases/testimony.ts` — the fixed emotion list, the validation schema (add `zod` as a dependency), and the submit function.

**Routes and UI**
- `app/cases/new` — title (+ optional context) form; creates the case and redirects to it.
- `app/cases/[caseId]/page.tsx` — the case page. What it renders depends on the stage and on whether *you* have submitted:
  - You haven't submitted → the testimony form.
  - You have, partner hasn't → the waiting screen.
  - Both submitted → an "ANALYSIS — the court is reviewing" holding screen.
- `components/court/testimony-form.tsx` — six questions in the court style: free text, an emotion chip picker (Angry, Hurt, Ignored, Frustrated, Disappointed, Confused, Embarrassed, Other) with optional note, a 1–10 severity slider, and three more free-text fields.
- `components/court/waiting-screen.tsx` — a client component that polls every ~3 seconds and refreshes the page when the stage changes.
- `app/api/cases/[caseId]/status/route.ts` — small JSON endpoint the poller calls: returns the stage and *which partners have submitted* (booleans only — never testimony content).
- The Docket (`app/page.tsx`) gains a case list and a "File a case" button.

## 4. Key decisions

- **The reveal threshold is `VERDICT`, not `ANALYSIS`.** A partner cannot read the other's testimony — or their follow-up answers (Phase 4) — until the verdict. If A could read B's testimony during the follow-up round, A could tailor their answers to rebut it, and the point of two independent accounts is lost. One rule, applied to every private table.
- **Security in two layers.** Row Level Security is the safety net that makes a forgotten `WHERE` clause harmless. Server code does the rest: is this transition legal, have you already submitted.
- **Reads use the normal (RLS-respecting) client. The service-role client is used only for stage transitions** and, from Phase 4, the AI pipeline.
- **A single writer for stages.** No code anywhere else may write `cases.stage`. Combined with the missing update policy, there's exactly one path that can move a case.
- **Testimony is immutable.** No edit button. It keeps the model simple and stops people revising their story after seeing the case move on.
- **Case is created directly in `TESTIMONY`.** `CASE_OPEN` exists in the enum for spec fidelity but no case sits in it.
- **Race-safe by design.** Partner B's submission is what triggers `TESTIMONY → ANALYSIS`. Do it in the same server action, and let the compare-and-swap absorb the case where both partners submit within the same second.
- **Polling reads a tiny endpoint** that returns only booleans, not the full case, so it's cheap and can't leak.

## 5. Implementation notes

**Next.js 16:**
- Use **Server Actions** for form submissions (create case, submit testimony) — `'use server'`, receive `FormData`, `redirect()` afterwards. Server Actions run one at a time per client; fine for forms.
- `app/cases/[caseId]/page.tsx`: `const { caseId } = await params` (or use the global `PageProps<'/cases/[caseId]'>` type).
- The route handler signature is `GET(request, ctx: RouteContext<'/api/cases/[caseId]/status'>)` with `const { caseId } = await ctx.params`.
- Reads of user-specific data must not be cached — `fetch` isn't cached by default in 16 and Supabase queries aren't `fetch`-cached, but do not add `'use cache'` to anything that reads a session.
- After a mutation call `revalidatePath('/cases/' + id)` (before `redirect`, which throws).

**Polling:** a `useEffect` with `setInterval(…, 3000)` calling the status endpoint and `router.refresh()` when the stage changed. Clear the interval on unmount; pause when the tab is hidden (`document.visibilityState`); stop polling once a stage is reached that doesn't wait for the partner.

**Validation:** validate on the server even if the form validates in the browser. Trim text, cap length (for example 4,000 characters per field) — this is also your first defence against runaway AI costs later. Reject an emotion not in the fixed list.

**Handling the duplicate submit:** the unique constraint will raise Postgres error `23505` if a partner submits twice (double-click, two tabs). Catch that specific code and show "You've already testified" — not a crash.

**Privacy in logs:** never log testimony text. Log ids and stages only.

**Testing the privacy rule** — do this deliberately, it's the point of the phase: in the Supabase SQL editor (or with a second session), query `testimonies` as Partner A for Partner B's row while the case is at `TESTIMONY`. It must return zero rows, not an error and not the data.

## 6. Done when

- [ ] Partner A can file a case with a title; it appears on both partners' Docket.
- [ ] Partner A sees the six-question testimony form; submitting it shows the waiting screen.
- [ ] Partner B, on their own login, sees the same case and the form, but **cannot** see A's answers anywhere.
- [ ] While waiting, A's screen updates by itself within a few seconds after B submits — no manual refresh.
- [ ] After both submit, the case stage is `ANALYSIS` and both see the "court is reviewing" screen.
- [ ] Submitting a second testimony as the same partner is refused with a friendly message.
- [ ] Trying to read the partner's testimony directly from the database as a normal user returns nothing.
- [ ] The status endpoint response contains only stage and submitted-yes/no flags.
- [ ] No code outside `lib/cases/state-machine.ts` writes `cases.stage` (check with a text search for `stage:` and `.update(`).
- [ ] `npm run lint` and `npm run build` pass.

## 7. Deliberately not in this phase

- Any AI, analysis, or follow-up questions → Phase 4 (the case parks at `ANALYSIS`)
- The verdict, or revealing testimony → Phases 5–6
- Notifications ("your partner has submitted") → Phase 7
- The persistent Court Status panel → Phase 7
- Editing or deleting a submitted testimony; cancelling a case → not planned
