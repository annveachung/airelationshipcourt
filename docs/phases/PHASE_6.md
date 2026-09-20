# Phase 6 — Verdict UI, Feedback & Report

> **Updated while building:** the flow is verdict -> advice -> report -> **Peace Treaty**, and the case closes when **both partners sign** (or either partner adjourns without a treaty). The treaty has one required clause, three personalised clauses written by the AI from the case, and three silly fixed ones; the closing screen shows a Peace-o-meter. The report is AI-written (a separate "report writer" call, translated like the verdict) and prepared in the background while partners read the verdict. The Panel Agreement section is computed in code. Everything is bilingual (English + Traditional Chinese). Tables: `report_texts`, `treaty_signatures`, plus `cases.closed_reason` (migration `20260923000001_report_and_treaty.sql`). Printing uses a print stylesheet only — no PDF library, no share-as-image.

## 1. Goal

Turn the stored verdict into the experience the app is built around: a dramatic, readable final verdict, a walk through the court's findings and feedback, humorous charges, and a complete case report that becomes the permanent record. The case moves through `VERDICT → RECOMMENDATIONS → REPORT → CLOSED`. No new AI work — this phase is presentation and case closure on top of data that already exists.

## 2. Prerequisites

- Phases 1–5 complete; cases reach `VERDICT` with a `verdicts` row and three `panel_assessments`.
- Reference the Stitch "Final Verdict & Decree" screen for feel (fault meter, double-hairline frame, seal, signature block). Use it for the design language only.

## 3. What gets built

**Components** (`components/court/`)
- `verdict-card.tsx` — the double-hairline framed card: seal/emblem, case number and title, "FINAL VERDICT" heading.
- `responsibility-meter.tsx` — the fault allocation meter. Two labelled sides (Partner A / Partner B) with large percentages and a bar split at the final numbers (soft rose → deep espresso). Built on Phase 1's progress bar. Names shown are the partners' display names, not "A/B".
- `verdict-headline.tsx` — "PARTNER B · MORE RESPONSIBLE", driven by the stored percentages and the tie-break rule from Phase 5.
- `panel-perspectives.tsx` — three short cards (⚖️ Jury, 👨‍👩‍👧 Family Counsellor, 🧑‍⚖️ Social Worker), each a one-paragraph summary and that member's own split, collapsed by default with "read more".
- `key-findings.tsx` — "What the Court Found": primary issue, underlying issue, main escalation factor, biggest misunderstanding — a scannable list.
- `feedback-section.tsx` — three blocks: for Partner A, for Partner B, for both. Shows **your own** feedback prominently.
- `charges.tsx` — humorous charge chips grouped Partner A / Partner B / Both Parties, each with a ⚠️ marker.
- `recommendations.tsx` — the suggested resolution: individual suggestions plus one "together" suggestion. Phrased as recommendations, never orders.
- `case-report.tsx` — the full report layout.

**Routes**
- `app/cases/[caseId]/page.tsx` — now renders by stage:
  - `VERDICT` → verdict card, meter, headline, panel perspectives, key findings. A "Continue" button.
  - `RECOMMENDATIONS` → feedback, charges and suggestions. A "Continue" button.
  - `REPORT` → the full case report with a "Close case" button.
  - `CLOSED` → the same report, read-only, with no action button.
- `app/cases/[caseId]/report/page.tsx` — a direct link to the report at any stage `>= REPORT`, for revisiting later from the Docket.

**Server actions**
- `advanceStage(caseId)` — the "Continue" and "Close case" buttons. Uses the state machine's compare-and-swap: `VERDICT → RECOMMENDATIONS`, `RECOMMENDATIONS → REPORT`, `REPORT → CLOSED` (sets `closed_at`). Either partner can press it; if both do at once, the second is a harmless no-op.

**Database**
- Likely **no new tables.** Everything shown already lives in `verdicts`, `panel_assessments`, `case_analyses`, `testimonies`. If a report field turns out to be missing, add it in `supabase/migrations/0005_report_fields.sql` rather than recomputing it in the UI.

## 4. Key decisions

- **`VERDICT → RECOMMENDATIONS → REPORT` is pagination over data that already exists.** Three stages, one `verdicts` row. It gives the court its ritual pacing, but no new tables and no new AI calls — resist building infrastructure for a wizard.
- **The verdict screen is optimised for reading, the report for record-keeping.** Verdict: concise, one clear answer. Report: complete.
- **Report sections** (from the spec): Case Summary · Primary Conflict · Secondary Issues · Emotional Themes · Key Discrepancies · Follow-up Findings · Panel Perspectives · Panel Agreement · Charges · Final Responsibility Percentage · Final Verdict · Court Summary · Feedback.
- **Both testimonies appear in the report**, side by side — this is the moment they were unlocked (Phase 5), and it is the point of the reveal rule.
- **Tone:** the wording should be funny on the surface and kind underneath. Charges are playful; the feedback should never be cruel. Review the synthesis prompt's output here and adjust the prompt text if the tone is off.
- **Explain the percentage in the UI.** A small caption: "Estimated responsibility for this specific conflict." It is not a judgement of the relationship.
- **Design:** follow Stitch's language (cream canvas, espresso, rose, hairlines, pills) but lay content out for *this* app's data, not the mock content.

## 5. Implementation notes

**Next.js 16:**
- These are mostly Server Components reading from Supabase; only the buttons need to be client-side. `await params` for `caseId`.
- After `advanceStage`, call `revalidatePath` before `redirect`.
- No `'use cache'` on anything session-specific.

**Reading data:** by now RLS lets partners read everything (`stage >= 'VERDICT'`). Use the normal client — you should not need the service role in this phase. If you find yourself wanting it, something is wrong.

**Names, not roles:** the data uses `partner_a` / `partner_b`. Map to display names once, in one helper, then use names everywhere in the UI.

**Meter maths:** the bar's widths come straight from `final_responsibility_a/b`. Never recompute from panel scores in the UI — display what the backend stored.

**Long text:** panel reasoning can be several paragraphs; truncate with "read more" on the verdict screen and show it in full only in the report.

**Charges:** the synthesis step chooses from the template list in `lib/cases/charges.ts`. The UI should tolerate an unknown charge string gracefully (show it as-is) in case the model drifts.

**Mobile:** this is the screenshot-worthy screen; check it at ~390px wide. Test with very long partner names and with a 50/50 split.

**Printable report (optional, cheap):** a `print` stylesheet so the browser's "Save as PDF" gives a clean copy — no PDF library needed.

## 6. Done when

- [ ] Opening a case at `VERDICT` shows the framed verdict card with the meter, correct percentages, and the "more responsible" headline.
- [ ] The three panel perspectives are visible, each with its role's emoji, summary and split, and expandable.
- [ ] "Continue" moves to `RECOMMENDATIONS`; feedback for each partner, the joint feedback, charges and suggestions all render.
- [ ] "Continue" again shows the full report with all thirteen sections and both testimonies.
- [ ] "Close case" sets the stage to `CLOSED` and hides the button; reloading still shows the report read-only.
- [ ] Both partners pressing "Continue" at the same moment advances **one** stage, not two.
- [ ] The displayed percentages match the database `verdicts` values exactly.
- [ ] The screen has no horizontal scrolling at 390px and handles an unusually long name and a 50/50 result.
- [ ] Reading the generated text out loud: playful, never insulting.
- [ ] `npm run lint`, `npm test` and `npm run build` pass.

## 7. Deliberately not in this phase

- The persistent Court Status panel and notifications → Phase 7
- Listing past cases, statistics, charts, the Argument Stock Market → Phase 8
- PDF export as a feature, sharing the verdict card as an image → not planned (print stylesheet only)
- Editing or contesting a verdict → not planned
