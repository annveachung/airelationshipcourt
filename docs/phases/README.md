# AI Relationship Court — Phase Plan

This folder is the build plan. The product itself is described in [`../PRODUCT_DESC.md`](../PRODUCT_DESC.md); these files say **in what order** to build it and **what "done" means** at each step.

Eight phases, done strictly in order. Every phase ends with something you can click through in the browser, so you always have a working app.

| # | Phase | You'll be able to… | Needs accounts? |
|---|---|---|---|
| 1 | [Foundation & Design System](PHASE_1.md) | See every UI building block in the court's look | No |
| 2 | [Auth & Couple](PHASE_2.md) | Sign in with Google, create a couple, invite a partner | Supabase + Google |
| 3 | [Case & Testimony](PHASE_3.md) | File a case; both partners submit testimony privately | — |
| 4 | [AI Analysis & Follow-up](PHASE_4.md) | Watch the court analyse the case and ask follow-up questions | DashScope |
| 5 | [AI Panel & Verdict](PHASE_5.md) | Get a verdict with a backend-computed responsibility split | — |
| 6 | [Verdict UI, Feedback & Report](PHASE_6.md) | Read the verdict, feedback, charges and full case report | — |
| 7 | [Court Status & Notifications](PHASE_7.md) | See live trial progress and get notified at each step | — |
| 8 | [History & Analytics](PHASE_8.md) | Browse past cases and the Argument Stock Market | — |

## How to use these docs

1. Do one phase at a time. Don't start N+1 until every box in N's **Done when** list is ticked.
2. Start each phase in a fresh Claude Code session and say: *"Implement docs/phases/PHASE_N.md."*
3. Each phase doc has the same seven sections: Goal, Prerequisites, What gets built, Key decisions, Implementation notes, Done when, Deliberately not in this phase.
4. If something in a phase doc turns out wrong, fix the doc first, then the code.

## Locked decisions (don't reopen mid-phase)

| Topic | Decision |
|---|---|
| Framework | Next.js 16.3.5 (App Router), React 19, TypeScript, Tailwind v4 |
| Database + login | Supabase — Postgres + Google OAuth, queried with `supabase-js` and `@supabase/ssr`. No separate ORM. |
| AI provider | Alibaba DashScope (Qwen) through its OpenAI-compatible endpoint, using the `openai` npm package |
| Waiting for partner | Auto-polling every ~3 seconds. No websockets. |
| Design | Stitch project "AI Relationship Court" — follow its colours and design language, **not** its literal screens |
| Reveal rule | A partner can't read the other's testimony, follow-up answers or the case analysis until the case reaches `VERDICT` |
| Responsibility % | Computed by backend code from the three panel scores. Never taken from a model. |

## Next.js 16 rules that apply to every phase

This is not the Next.js in most tutorials. `AGENTS.md` says to read `node_modules/next/dist/docs/` before writing code — do that when a phase touches a new feature.

- `cookies()`, `headers()`, `params` and `searchParams` are **async only**. Always `await` them.
- `middleware.ts` is now **`proxy.ts`**, and the exported function must be named `proxy`. It runs on Node, not the edge.
- `fetch` is **not cached** by default.
- Route handlers are `app/**/route.ts`; their `params` is a Promise.
- Typed helpers `PageProps<'/route'>`, `LayoutProps<'/route'>` and `RouteContext<'/route'>` are global (no import).
- Tailwind v4 has **no `tailwind.config.js`**. Design tokens live in `@theme` inside `app/globals.css`.
- `next lint` no longer exists; `npm run lint` runs `eslint` directly.
- Path alias: `@/*` maps to the repo root (there is no `src/` folder), e.g. `@/lib/ai/client`.
- `zod` is only a transitive dependency today — `npm install zod` before importing it.

## Shared conventions

**Folders** (created as phases need them):

```
app/                  routes, pages, route handlers
components/ui/        design-system primitives (Phase 1)
components/court/     court-specific pieces (verdict meter, status panel…)
lib/supabase/         browser, server and service-role clients
lib/cases/            state machine and case logic
lib/ai/               DashScope client, prompts, zod schemas
supabase/migrations/  numbered SQL files, applied in order
docs/phases/          these plan files
```

**Secrets** go in `.env.local` (already git-ignored). Never paste a key into chat or commit it. Variables introduced along the way:

| Variable | Phase | Exposed to browser? |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | 2 | yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 2 | yes |
| `SUPABASE_SECRET_KEY` | 3 | **never** |
| `DASHSCOPE_API_KEY` | 4 | **never** |
| `DASHSCOPE_BASE_URL` | 4 | no |
| `DASHSCOPE_MODEL` | 4 | no |

**Case stages** (the backend enforces these in order; there is no going back):

```
CASE_OPEN → TESTIMONY → ANALYSIS → FOLLOW_UP → PANEL_JUDGEMENT
          → VERDICT → RECOMMENDATIONS → REPORT → CLOSED
```

Default we chose: a case is created directly in `TESTIMONY`. `CASE_OPEN` stays in the database enum to match the spec but nothing sits in it — "file a case" is just the title form. Say so if you'd rather keep it as a real stage.

## Reading order for the data model

The full table design was worked out once and is split across phases so you only meet each table when you need it:

| Tables | Phase |
|---|---|
| `profiles`, `couples`, `couple_members`, `couple_invites` | 2 |
| `cases`, `testimonies` | 3 |
| `ai_runs`, `case_analyses`, `follow_up_questions`, `follow_up_answers`, `follow_up_submissions` | 4 |
| `panel_assessments`, `verdicts` | 5 |
| `notifications` | 7 |
| *(no new tables — SQL aggregation over the above)* | 8 |

## Applying database migrations

Migrations are SQL files in `supabase/migrations/`, named with a timestamp (for example `20260919000002_cases_and_testimony.sql`). Phase docs may still say "paste into the SQL Editor" and use `0003_…`-style names — use a timestamped name instead and apply with the Supabase CLI:

```
npx supabase db push
```

One-time setup: `npx supabase login`, then `npx supabase link --project-ref <your-project-ref>` (it asks for your database password). `db push` applies only migrations that haven't run yet.

## Things deliberately left out of the whole project (for now)

Email or push notifications, websockets/realtime, a job queue, multiple couples per user, invite-by-email, a second follow-up round, weighted panel scoring, PDF export, soft deletes and audit logs.
