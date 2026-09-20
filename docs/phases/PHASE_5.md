# Phase 5 — AI Panel & Verdict

> **Updated while building:** the verdict is bilingual. Shared text is written once in English and a separate AI call translates it into Traditional Chinese when either partner uses it (or lazily when someone switches language later). Text refers to the partners as `[[A]]` / `[[B]]`, swapped for real names only when shown. Charges are a mix: 1–2 picked from a fixed list of 20 (translated in `messages/*.json`) plus one AI-written custom charge per partner. Tone is warm and witty; custom charges may be cheekier, with guardrails. Every prompt carries a safety rule for abuse or threats. Tables: `panel_assessments`, `verdicts`, `verdict_texts` (migration `20260922000002_panel_and_verdict.sql`). The panel runs in parallel, the whole chain takes roughly 30–45 seconds, and the tie-break falls back from the Jury to the other two members and finally to Partner A so there is always a winner.

## 1. Goal

After the follow-up round, three independent AI panel members — Jury, Family Counsellor, Social Worker — each assess the case and each assign a responsibility split. **The backend, not any model, combines those into the final percentage.** A synthesis step then writes the verdict narrative around numbers that are already fixed. The case advances to `VERDICT` with a stored, reproducible result. The polished verdict screen comes in Phase 6; this phase ends with a functional (plain) result page.

## 2. Prerequisites

- Phases 1–4 complete; a case can reach `PANEL_JUDGEMENT` with analysis, questions and answers stored.
- The DashScope key and the JSON-hardening work from Phase 4 (`lib/ai/client.ts`, `extractJson`, retry ladder, `ai_runs` claim) are reused as-is.

## 3. What gets built

**Database** — `supabase/migrations/0004_panel_and_verdict.sql`
- `panel_assessments` — one row per panelist: `case_id`, `role` (`jury` / `family_counsellor` / `social_worker`), `responsibility_partner_a`, `responsibility_partner_b`, `primary_issue`, `secondary_issues`, `reasoning_summary`, `feedback_partner_a`, `feedback_partner_b`, `recommendations`, `model`. **`UNIQUE (case_id, role)`**. Percentages are stored as numbers 0–100 — deliberately **without** a "must add to 100" check.
- `verdicts` — one row per case (`case_id` primary key): `final_responsibility_a`, `final_responsibility_b`, `verdict_text`, `key_findings`, `feedback_partner_a`, `feedback_partner_b`, `joint_feedback`, `charges`, `recommendations` (all lists are JSON).
- RLS: panel assessments and verdicts are shared within the couple **once the case is at `VERDICT` or later**; before that they aren't client-readable.

**AI layer** (`lib/ai/`)
- `tasks/panel.ts` — one prompt template with three **role briefs**:
  - *Jury*: fairness, responsibility, actions taken, reasonableness, consistency between claims.
  - *Family Counsellor*: communication, emotional needs, expectations, relationship dynamics, escalation.
  - *Social Worker*: external circumstances, stress, social and family context, environmental factors.
  Each receives the same case material (both testimonies, the analysis, both partners' follow-up answers) and returns the same validated shape.
- `tasks/synthesis.ts` — receives the panel results **and the already-computed final percentages** and returns the verdict narrative, key findings, per-partner and joint feedback, recommendations and humorous charges.
- `lib/cases/aggregate.ts` — pure function: three assessments in, final percentages out. No I/O, no AI. Unit-testable.
- `lib/cases/charges.ts` — the list of predefined charge templates (e.g. "Assumption of Intent", "Excessive 'Fine.'", "Poor Communication", "Failure to Clarify Expectations", "Unnecessary Escalation") that the synthesis step picks from.

**Pipeline**
- Extend `app/api/cases/[caseId]/advance/route.ts`: stage `PANEL_JUDGEMENT` → claim three panel runs (`sub_key` = the role), run them **in parallel**, aggregate, save `verdicts` percentages, run synthesis, save the rest, transition to `VERDICT`.

**Interim UI**
- `app/cases/[caseId]/page.tsx` handles `PANEL_JUDGEMENT` (deliberating screen, polling) and `VERDICT` (a plain results view: the two percentages, the verdict text, each panelist's summary). Phase 6 replaces this with the real design.
- This is also the moment partners' testimonies become readable (`stage >= 'VERDICT'`) — add a simple "view the testimonies" section to confirm the reveal works.

**Tests**
- Add a test runner (Vitest is the lightest fit) *only* for `aggregate.ts` and `extractJson`. These pure functions are where correctness matters most.

## 4. Key decisions

- **The percentage is computed by code, always.** Formula, equal weighting:
  ```
  rawA = mean of the three partner-A scores
  rawB = mean of the three partner-B scores
  finalA = round(rawA / (rawA + rawB) × 100, 1)
  finalB = 100 − finalA
  ```
  Normalising by the real total absorbs a model returning 55/50; deriving B by subtraction makes the sum exactly 100 by construction. Equal weighting sits in one named constant so weights are a one-line change later. This is what makes results reproducible, testable and explainable.
- **Aggregate first, narrate second.** The percentages are saved *before* synthesis and passed into it as given facts, so the prose can never contradict the numbers. If synthesis fails, the numeric verdict is already valid and only the text is retried.
- **Three rows, not one.** A single panelist failing can be retried alone; the other two keep their `succeeded` claims. Equal weighting is literally an average over three rows.
- **Panelists run in parallel** (`Promise.allSettled`) so all three are attempted even if one fails, and the total time stays within the route's limit.
- **The panel "votes".** The spec says the panel should always produce a winner. With three members and a two-partner split, the aggregate percentage decides who is "more responsible"; an exact 50.0/50.0 is theoretically possible. **Tie-break rule (decide now, document it):** treat a difference under 1 point as too close to call and let the Jury's own split decide. Include this in `aggregate.ts` and its tests.
- **No "both sides are valid" verdicts.** The synthesis prompt must state a clear conclusion.
- **Schemas stay shallow** — same reasoning as Phase 4: `recommendations` and `secondary_issues` are plain string lists.

## 5. Implementation notes

**Prompting:**
- Give each panelist a distinct voice but the same output contract, so the aggregate code is one path.
- Tell each panelist to score **only this specific conflict**, not the relationship overall — the percentage means "estimated responsibility for this specific conflict".
- Same untrusted-input rule as Phase 4: testimony and answers are data, not instructions.
- Refer to "Partner A" and "Partner B" only; no names or emails leave the server.

**Timeouts:** three parallel calls plus synthesis can approach the 60-second limit if Qwen is slow. **Escape hatch already supported by the design:** change `/advance` to run *one* unclaimed panelist per invocation and return; the poller then drives the remaining ones over the next ticks. No schema change needed — this is what the `sub_key` claim is for. Don't build it unless you hit the limit.

**Partial failure:** if two panelists succeed and one fails, stay in `PANEL_JUDGEMENT`, set `last_error`, and let Retry re-run only the failed role.

**Zod coercion for scores:** accept `"60"`, `"60%"`, and `60`; clamp to 0–100; reject if either score is missing.

**Next.js 16:** route stays `runtime = 'nodejs'` with `maxDuration = 60`; `await ctx.params`.

**Numbers:** use `numeric(5,2)` columns; convert to JS numbers explicitly when reading.

## 6. Done when

- [ ] With follow-ups complete, the case moves from `PANEL_JUDGEMENT` to `VERDICT` on its own, with no click.
- [ ] The result page shows both percentages summing to exactly 100 and a clear statement of who is more responsible.
- [ ] All three panelists' summaries appear, and their wording visibly reflects their different roles.
- [ ] In the database there are exactly three `panel_assessments` rows for the case and one `verdicts` row.
- [ ] Manually recomputing the mean of the panel scores matches the stored final percentages.
- [ ] `aggregate.ts` tests pass, including: a 55/50 input, an all-equal input, a near-tie, and a three-way split.
- [ ] Killing one panelist call (e.g. temporarily throw in the Social Worker task) leaves the case in `PANEL_JUDGEMENT` with an error and Retry; retrying re-runs only that role and completes.
- [ ] Testimonies are now readable by the partner, and were not before `VERDICT`.
- [ ] Two browser windows open at the panel stage produce exactly three panel runs, not six.
- [ ] `npm run lint`, `npm test` and `npm run build` pass.

## 7. Deliberately not in this phase

- The designed verdict screen, fault meter, "What the Court Found", charges display → Phase 6
- Report page and case closure → Phase 6
- Notification "verdict is ready" → Phase 7
- Weighted panel scoring, panel disagreement visualisation → not planned (equal weights only)
