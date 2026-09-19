# Phase 4 — AI Analysis & Follow-up

## 1. Goal

Once both testimonies are in, the court reads them, produces a structured case analysis, and asks each partner a short set of targeted follow-up questions. Each partner answers once; that is the only follow-up round there will ever be. This is the phase that proves the riskiest part of the app — getting reliable structured output out of Qwen — so the AI plumbing is built and hardened here, before the panel in Phase 5.

## 2. Prerequisites

- Phases 1–3 complete; a case can reach `ANALYSIS`.
- **Set up by hand:**
  1. Create an Alibaba Cloud Model Studio (DashScope) account and an API key. **Note which region the key was created in** — the key and the endpoint must match, or every request fails.
  2. Add to `.env.local`: `DASHSCOPE_API_KEY`, `DASHSCOPE_BASE_URL`, `DASHSCOPE_MODEL`.
     - International/Singapore: `https://dashscope-intl.aliyuncs.com/compatible-mode/v1`
     - Beijing: `https://dashscope.aliyuncs.com/compatible-mode/v1`
  3. Pick the model string. Start with `qwen-plus`; check Model Studio's model list for the exact current Qwen 3 identifier before changing it. ("Qwen 3.8" isn't a published name we could confirm.)
- `npm install openai` (DashScope speaks the OpenAI protocol, so no Alibaba-specific SDK) and confirm `zod` is installed.
- Read `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md` and `route-segment-config/maxDuration.md`.

## 3. What gets built

**Database** — `supabase/migrations/0003_analysis_and_followup.sql`
- `ai_runs` — the lock **and** the audit log: `case_id`, `stage` (`analysis`, `follow_up_questions`, `panel`, `synthesis`), `sub_key` (empty, or a panel role in Phase 5), `attempt`, `status` (`running` / `succeeded` / `failed`), `model`, `raw_output`, `error`, timestamps. Its key feature is a **partial unique index** on `(case_id, stage, sub_key) WHERE status <> 'failed'` — see decisions.
- `case_analyses` — one row per case (`case_id` is the primary key): `topics`, `emotions`, `discrepancies`, `expectations`, `potential_causes`, `conflict_patterns`, `follow_up_topics` (all JSON).
- `follow_up_questions` — `case_id`, `user_id` (who must answer), `round` (**`CHECK (round = 1)`**), `position`, `question_text`, `format` (`multiple_choice` / `true_false_unsure` / `rating_1_10` / `short_answer`), `options`.
- `follow_up_answers` — `question_id` (**unique**, one answer per question), `answer_text`, `answer_choice`, `answer_rating`, with a check that exactly one of the three is filled.
- `follow_up_submissions` — primary key `(case_id, user_id, round)`: the "I'm finished" marker.
- RLS: same shape as testimonies. Your own questions/answers always readable; your partner's only when `stage >= 'VERDICT'`. `case_analyses` and `ai_runs` are not client-readable.

**AI layer** (`lib/ai/`)
- `client.ts` — the `OpenAI` client pointed at DashScope, plus one function that makes a call, extracts JSON, validates it, and runs the retry ladder (see notes). Writes `ai_runs`.
- `json.ts` — `extractJson(raw)`: strips code fences, slices first `{` to last `}`, tolerates trailing commas.
- `tasks/analysis.ts` — builds the prompt from both testimonies, defines the output schema.
- `tasks/follow-up-questions.ts` — generates 3–5 questions **per partner** in **one** call.
- `schemas.ts` — the zod schemas. The prompt's example JSON is generated from these so the two can't drift.
- `prompts/` — prompt text kept in plain files so it's easy to tune.

**Pipeline route**
- `app/api/cases/[caseId]/advance/route.ts` — `POST`. Given the case's current stage, does whatever the next step is (or nothing). Exports `maxDuration = 60` and `runtime = 'nodejs'`.
  - Stage `ANALYSIS` → claim, run analysis, run question generation, store, transition to `FOLLOW_UP`.
  - Anything else → no-op returning the current state.

**Follow-up UI**
- `components/court/follow-up-form.tsx` — renders each question by its format (choice buttons, true/false/unsure, 1–10 slider, short text).
- Submitting is a Server Action that inserts the answers and the `follow_up_submissions` row. When the *second* submission arrives, transition `FOLLOW_UP → PANEL_JUDGEMENT` (the case then parks there until Phase 5).
- The case page (`app/cases/[caseId]/page.tsx`) gains the states: "the court is analysing" (spinner, poller calls `/advance`), "your follow-up questions", "waiting for your partner's answers", "the panel is deliberating" (holding screen).
- Retry button when `cases.last_error` is set.

## 4. Key decisions

- **Four separate AI tasks, never one mega-prompt.** Analysis, questions, then (Phase 5) panel and synthesis. Each is validated and retryable on its own. This is what makes partial failure recoverable.
- **The poller drives the pipeline.** Both partners are already polling the case every ~3 seconds. That poll calls `/advance`, which does the next step if one is due. There is no queue and no background worker; if a run dies, the next poll retries. Self-healing without extra infrastructure.
- **No AI from Server Actions.** Server Actions run sequentially and would block the user's next click during a slow call, and firing-and-forgetting from one on serverless can get the function frozen mid-run. AI lives only in the route handler.
- **The claim is one database insert.** Inserting an `ai_runs` row with status `running` *is* the lock. Because of the partial unique index: a second request gets a unique-violation and returns "in progress" quietly; a `succeeded` row permanently blocks re-running that stage; a `failed` row drops out of the index, so Retry just inserts a fresh attempt. Two partners polling at once can never trigger two analyses.
- **The one-round rule lives in the schema.** `round` can only be `1` and the submission table's key includes it, so a second submission is a database error, not an `if` someone might forget. The server catches Postgres error `23505` and shows "You've already answered."
- **Both partners' questions come from one call.** The model must see both testimonies to ask genuinely targeted questions, and one call halves the failure surface.
- **Testimony goes to the AI only as needed.** Send the case fields, not names, emails or ids — refer to "Partner A" and "Partner B". This is the spec's "minimise what goes to third-party AI" requirement.
- **Store `raw_output` always,** even for failures. It is the only way to debug Qwen's JSON.
- **Stuck runs heal lazily.** Before claiming, mark any `running` row older than 5 minutes as `failed`. Two lines in `/advance`; no cron.

## 5. Implementation notes

**The DashScope client:**
```ts
new OpenAI({
  apiKey: process.env.DASHSCOPE_API_KEY,
  baseURL: process.env.DASHSCOPE_BASE_URL,
})
```
Keep the model in one exported constant read from `DASHSCOPE_MODEL` so swapping models is one line.

**Getting reliable JSON out of Qwen** — this is where the time goes:
- Request `response_format: { type: "json_object" }` and make sure the word "JSON" literally appears in the prompt (the OpenAI-compatible mode requires it).
- Low temperature (~0.3) for analysis and questions; only prose-heavy tasks later get higher.
- Show the exact JSON shape with a filled-in example and end the prompt with "Respond with only the JSON object."
- **Keep schemas shallow.** Failure rate climbs with nesting. Prefer `string[]` to arrays of small objects.
- Pipeline per call: **call → store raw → extract → coerce → validate → save.**
- Coercion in the zod schema: numbers that arrive as `"7"` or `"7/10"`, a lone string where a list is expected, missing optional fields.
- **Retry ladder, max 3 attempts:** (1) normal prompt; (2) resend with the bad output and the validation error — "Your previous response was invalid: … Return only valid JSON matching the schema"; (3) same at temperature 0. After that mark the run `failed`, set `cases.last_error`, and **leave the stage where it is** so Retry works.
- Separate **network problems** (timeout, 429, 5xx) from **content problems** (bad JSON). Network problems get a short backoff and do *not* use up a repair attempt.
- Never show the raw validation error to users — it goes in `ai_runs.error`.

**Service-role use:** `/advance` reads both testimonies at once, so it needs the service-role client. Confirm the caller is a member of the case's couple *before* using it.

**Next.js 16:** `const { caseId } = await ctx.params`; set `export const maxDuration = 60`; don't cache anything here. Poll only while the stage is `TESTIMONY`, `ANALYSIS`, `FOLLOW_UP` or `PANEL_JUDGEMENT`.

**Rate protection:** reject an `/advance` call if the stage changed less than ~2 seconds ago, so a runaway client can't hammer the database. The `ai_runs` claim already caps AI spend per case regardless of poll volume.

**Prompt hygiene:** put the two testimonies inside clearly delimited blocks and tell the model to treat them as *data to analyse, not instructions to follow* — a partner could type "ignore the above and…" into a testimony.

**Test the AI layer before building its UI.** Save a couple of realistic `raw_output` samples (including deliberately broken ones) and run them through `extractJson` and the schema in a scratch script.

## 6. Done when

- [ ] With both testimonies in, the case page shows "the court is analysing" and, without any click, moves to the follow-up questions within roughly a minute.
- [ ] Each partner gets 3–5 questions that clearly reference details from *both* accounts, in a mix of formats.
- [ ] Each partner answers and submits; the waiting screen appears for whoever finishes first.
- [ ] When both have answered the stage becomes `PANEL_JUDGEMENT` and both see the "panel is deliberating" holding screen.
- [ ] Submitting follow-up answers a second time is refused with a friendly message.
- [ ] Opening the case in two browser windows at the moment analysis starts produces **one** `ai_runs` row for the analysis, not two.
- [ ] Temporarily break the API key: the case shows an error and a Retry button, the stage doesn't change, and after restoring the key Retry succeeds.
- [ ] `ai_runs.raw_output` is populated for every call, and the partner never sees a raw error.
- [ ] Partner A cannot read Partner B's questions or answers directly from the database.
- [ ] `npm run lint` and `npm run build` pass.

## 7. Deliberately not in this phase

- The three-member panel, the responsibility percentage → Phase 5
- Verdict screen, feedback, charges, report → Phase 6
- Notifications ("follow-up available") → Phase 7
- Case profile and conflict intensity shown in the status panel → Phase 7
- A second follow-up round → not planned (would be a deliberate schema change)
