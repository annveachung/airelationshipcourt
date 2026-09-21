# Phase 7 — Court Status & Notifications

> **Updated while building:** the panel shows the case profile and conflict intensity as **coarse labels only** (issue and conflict-type labels from fixed, translated lists, and intensity as a Low / Moderate / High / Severe band — never the numbers), so partners can't work out each other's ratings before the verdict. Notifications store a type plus a name and are shown in each person's language, **playful by default with a plain-wording switch** in the bell menu (saved on the profile). One `<CaseLive>` provider polls the case status once for the waiting screens and the panel together; a slower shared provider polls notifications. New: `notifications` table, `court_status()`, `mark_notifications_read()`, `set_my_notification_style()` (migration `20260924000001_court_status_and_notifications.sql`). No email, push or websockets.

## 1. Goal

Make the case *feel* like a live court process. A persistent Court Status panel shows where the case is, what's done and what's next, what the AI panel is up to, and a case profile drawn from the analysis. A notifications system tells each partner about events that matter ("Your partner has submitted their testimony", "The verdict is ready"). Both run off the same polling loop that already drives the case, so nothing new needs to be connected in real time.

## 2. Prerequisites

- Phases 1–6 complete; a case can run the whole way from filing to `CLOSED`.
- Reference the spec's Court Status layout (section 8) and the notification examples (section 23).

## 3. What gets built

**Database** — `supabase/migrations/0006_notifications.sql`
- `notifications` — `user_id` (recipient), `case_id` (nullable), `type`, `title`, `body`, `read_at`, `created_at`. Indexed on `(user_id, created_at desc)` plus a partial index on unread rows for the badge count.
- `type` is plain text with a check list (not a database enum) — you'll add types often, and a text list needs no migration ceremony to grow.
- RLS: a user can read their own rows and set `read_at` on them. **No insert policy** — only server code creates notifications.

**Notification creation** (`lib/notifications.ts`)
- One function `notify(userId, caseId, type, …)` and a table mapping each type to its funny and its plain wording. Called from the **same server code that performs the event**, not from database triggers — the text lives in TypeScript next to the logic that caused it.
- Events wired up:
  - partner submitted testimony → the *other* partner
  - couple partner joined → the creator (from Phase 2's join flow)
  - analysis complete / follow-up available → both
  - partner completed follow-up → the other partner
  - panel judgement complete / verdict ready → both
  - case closed → the other partner
- Funny variants from the spec, e.g. "The court has received both sides of the story.", "The verdict is ready. Please prepare your ego."

**Status API**
- Extend Phase 3's `app/api/cases/[caseId]/status/route.ts` to return everything the panel needs in **one** response: stage, who has submitted what (booleans), panel run statuses, case profile and intensity (once available), and the unread notification count. Still no private content.
- `app/api/notifications/route.ts` — `GET` list for the current user; `POST` to mark read.

**UI** (`components/court/`)
- `court-status-panel.tsx` — the panel from the spec:
  - **Trial Progress** — a progress bar computed from the stage (each stage maps to a fixed percentage).
  - **Current Stage** — human wording ("Follow-up Round", "Panel Deliberation", "Verdict Ready").
  - **Case Status** — the checklist: ✓ A submitted · ✓ B submitted · ✓ AI analysis · ● Follow-up · ○ Panel judgement · ○ Final verdict.
  - **Case Profile** — primary issue, secondary issue, conflict type, once analysis exists.
  - **Conflict Intensity** — a 0–10 bar. Derived server-side (see notes).
  - **AI Panel** — ⚖️ Jury · 👨‍👩‍👧 Counsellor · 🧑‍⚖️ Social Worker, each Waiting / In progress / Ready.
  - **Notifications** — the latest few, with unread markers.
- `notification-bell.tsx` — in the app shell's top bar, unread badge, opens a dropdown/sheet.
- Layout: on a phone the panel is a collapsible sheet or a summary strip at the top of the case page; on wide screens it can sit beside the case as a side panel.

**Polling refactor**
- Replace Phase 3's ad-hoc poll with one shared hook, `hooks/use-case-poll.ts`, that fetches the status endpoint every ~3 seconds while the tab is visible, calls `/advance` when a stage is waiting on the AI, and exposes the latest status to every component on the page. The waiting screens, the panel and the bell all read from it.

## 4. Key decisions

- **The panel is honest.** With only one submission and one follow-up round, the panel must not fake constant activity. It reports real stage and real run status — that's why it's called *Court Status*, not a live feed.
- **One status response, one poller.** Avoids several components each polling their own endpoint. Cheaper and impossible to get out of sync.
- **Notifications are written where events happen** — in the server code path, in the same request — never by database triggers, and never on the client.
- **Notifications are simple rows.** No email, push, or websockets (the spec lists those as "later"). Polling is enough.
- **Conflict intensity is a rule, not an AI call.** A fixed formula, e.g. the average of the two partners' 1–10 severity ratings from testimony, optionally nudged by the analysis. It's reproducible and free. Decide the formula, document it in code, and keep it in one function.
- **Case profile comes from the existing analysis** (primary/secondary issue, conflict type) — no new AI work. If the analysis schema lacks "conflict type", add it to the Phase 4 analysis schema in this phase rather than making another call.
- **The panel must respect the reveal rule.** Showing "Partner B has submitted" is fine; showing anything of *what* they wrote before `VERDICT` is not. Booleans and stages only.
- **Progress percentages per stage** live in one lookup table (e.g. TESTIMONY 15, ANALYSIS 30, FOLLOW_UP 50, PANEL_JUDGEMENT 70, VERDICT 85, then REPORT/CLOSED up to 100).

## 5. Implementation notes

**Next.js 16:**
- The panel is a client component driven by the poll hook; the page shell can stay a Server Component. `router.refresh()` is still how server-rendered parts update after a stage change.
- The notifications route handler is `app/api/notifications/route.ts`; user-specific, so no caching — and never add `'use cache'` to it.
- Add the bell to `components/app-shell.tsx` from Phase 1.

**Polling hygiene:** pause when the tab is hidden; back off (e.g. to 10s) when the case is `CLOSED` or the stage is one that doesn't wait on anything; stop entirely at `CLOSED`. Clear timers on unmount. Only one poller per page.

**Don't spam:** dedupe notifications (a retry of a failed step must not create a second "analysis complete"). Use a unique key of `(user_id, case_id, type)` for one-shot event types.

**Marking read:** opening the dropdown marks the visible ones read; the unread count in the status response updates on the next poll.

**Security:** the status endpoint must confirm the caller belongs to the case's couple before returning anything, and use the normal (RLS) client for reads.

**Tone check:** the funny variants are optional flavour; keep the plain wording as the fallback and consider a small setting to switch playful wording off.

## 6. Done when

- [ ] Every case page shows the Court Status panel with correct progress, stage name and checklist for the current stage.
- [ ] The panel updates by itself as the stage changes — no refresh — on **both** partners' screens.
- [ ] Case Profile and Conflict Intensity appear after analysis and show sensible values.
- [ ] The AI Panel rows show Waiting → In progress → Ready during Phase 5's panel stage.
- [ ] Each event in the list above creates exactly one notification for the right person; a retried step does not duplicate it.
- [ ] The bell shows an unread count, opening it lists notifications, and reading them clears the badge.
- [ ] Nothing in the status response or panel reveals a partner's testimony or answers before `VERDICT`.
- [ ] There is a single poller per page (check the browser's network tab: one status request per interval, not several).
- [ ] Polling stops at `CLOSED` and pauses in a background tab.
- [ ] `npm run lint`, `npm test` and `npm run build` pass.

## 7. Deliberately not in this phase

- Email, push notifications, websockets/Supabase Realtime → not planned (the spec marks them "optional later")
- Cross-case history, charts, statistics → Phase 8
- Notification preferences beyond a playful/plain toggle → not planned
