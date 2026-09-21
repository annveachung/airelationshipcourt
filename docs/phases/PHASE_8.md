# Phase 8 — History & Analytics

> **Note from Phase 7:** the analysis' primary issue, secondary issue and conflict type now come from **fixed lists** (`lib/cases/taxonomy.ts`), translated in `messages/*.json`, so issue counts can group on them directly. Cases analysed before Phase 7 may still hold free-text labels — map those with `normalizeIssue()` / `normalizeConflictType()` when aggregating.

## 1. Goal

Once a couple has a few closed cases, show them the bigger picture: a history of past cases and a set of summary statistics and charts — most common issues, average responsibility, conflict intensity over time, common emotions — including the humorous Argument Stock Market. This is the "product analysis" phase: it adds no new AI and, ideally, no new tables. It's SQL aggregation over data the earlier phases already collect.

## 2. Prerequisites

- Phases 1–7 complete.
- **Enough data to look at.** Build a handful of closed cases first (the app can produce them end to end by now). If that's slow, add a **dev-only seed script** (`supabase/seed.sql` or `scripts/seed-history.ts`) that inserts 6–10 realistic finished cases for one couple, clearly marked as fake, run only against your development project. Don't build charts against an empty database.
- Skim the `dataviz` guidance if using Claude to build the charts, and decide on a chart library (see decisions).

## 3. What gets built

**Data layer** (`lib/analytics/`)
- `history.ts` — list of a couple's cases (newest first): title, date, stage, final split, primary issue.
- `stats.ts` — the aggregates below. Each is one query (or one small Postgres view/function) returning already-shaped data, so the page does no number-crunching.
- Consider one migration, `supabase/migrations/0007_analytics_views.sql`, defining a few read-only views (e.g. `couple_case_summary`) if the queries get repetitive. Views inherit the same access rules — confirm RLS still applies (see notes).

**Routes**
- `app/history/page.tsx` — the "Verdicts" tab from Phase 1's shell. Case history list plus the summary at the top.
- `app/history/insights/page.tsx` (or a section on the same page) — the charts.
- Case rows link to the existing report at `app/cases/[caseId]/report`.

**Summary block** — "YOUR CASE HISTORY":
- Cases completed
- Most common issue and runner-up
- Average responsibility, e.g. A 47% / B 53%
- Average conflict intensity

**Charts** (`components/court/charts/`)
- **Conflict topics over time** — how often each issue category appears per case/month.
- **Case intensity over time** — a line of the intensity score per case.
- **Responsibility distribution** — each case's A/B split (e.g. a strip or stacked bars), plus the running average.
- **Common emotions** — counts from testimony emotion selections.
- **Recurring conflict patterns** — the most frequent items from the analyses' `conflict_patterns`.
- **Argument Stock Market** — the humorous board: each issue category with an arrow and a percentage change versus the previous period, and a headline "who's winning" line. Values are simple derived numbers (share of cases where the issue appeared this period versus last), not financial data. Keep the jokes in the labels, keep the maths boring and deterministic.

## 4. Key decisions

- **No new AI, no new tables.** Everything is a `SELECT` with `GROUP BY` over `cases`, `verdicts`, `case_analyses`, `testimonies`, `panel_assessments`. If you're tempted to add an analytics table, don't — it's premature until the queries are actually slow.
- **Only closed (or verdict-reached) cases count.** Half-finished cases would skew averages and reveal-rule-protected data. Filter on `stage >= 'VERDICT'`.
- **Charts stay simple.** A small, dependency-light charting approach (hand-built SVG for the two or three simplest charts, or one library such as Recharts for the rest). One approach, chosen once, used consistently. Palette from Phase 1's tokens — espresso, rose, walnut — not a default rainbow.
- **Respect the reveal rule.** Because every case here is at `VERDICT` or later, the underlying rows are readable by both partners. Queries must still go through the normal (RLS) client, not the service role. Aggregating testimony-derived data (emotions) is only safe *because* of the stage filter.
- **The stock market is a joke on top of a real number.** Same underlying data as "common issues"; only the presentation and wording differ.
- **Empty and thin states matter.** With 0–2 cases, show a friendly "Not enough cases for trends yet" rather than a broken or misleading chart.
- **Percent changes need a floor.** With very few cases a single case swings a percentage wildly; only show arrows once there are at least 3 cases, and cap or hide silly values.

## 5. Implementation notes

**Next.js 16:**
- Pages can be Server Components that run the queries and pass shaped data into small chart components. Charts that need hover or animation are client components; static SVG ones can stay on the server.
- These queries are user-specific — do **not** use `'use cache'` on them. (Caching a couple's stats safely would need `'use cache: private'`; not worth it at this scale.)
- `await` `cookies()` in the Supabase server client as before.

**SQL:**
- JSON fields (`topics`, `conflict_patterns`) need `jsonb_array_elements_text(...)` to count items. Emotions in `testimonies` are a text array — use `unnest(emotions)`.
- Standardise the issue categories (Communication, Expectations, Trust, Assumptions, Stubbornness, …) as a fixed list in one TypeScript constant and normalise the model's free-text `primary_issue` to that list when *saving* the verdict or in the query, otherwise "communication", "Communication issues" and "poor comms" become three bars. If earlier phases stored free text, add the normalisation here.
- Views and RLS: a view runs with its owner's rights by default. Either create it `WITH (security_invoker = true)` so the caller's RLS applies, or query the base tables directly. Verify with two accounts from different couples that neither sees the other's numbers.
- Average responsibility: average the **stored final** percentages from `verdicts`, not the raw panel scores.

**"Who is the more winning one"** (from the spec): the couple's running tally of who was found less responsible per case, shown as a light-hearted scoreboard. Ties are fine and should say so.

**Performance:** at a couple's scale (tens of cases) nothing here needs indexes beyond Phase 3's `(couple_id, created_at desc)`. Don't optimise early.

**Responsive:** charts must be legible at 390px. Prefer horizontal bars and short labels on phones.

## 6. Done when

- [ ] The "Verdicts" tab lists the couple's past cases with date, title, final split and primary issue; each opens its report.
- [ ] The summary block shows correct cases-completed, most common issue, runner-up, average responsibility and average intensity (spot-check against the database by hand).
- [ ] Each chart renders with real data and matches a manual count for at least one.
- [ ] The Argument Stock Market shows arrows and percentage changes, hidden or softened with fewer than 3 cases.
- [ ] With 0–2 cases, the page shows a friendly empty state, not errors.
- [ ] Partially finished cases are excluded from every number.
- [ ] Signed in as a member of a *different* couple, none of the first couple's data is visible.
- [ ] No query in this phase uses the service-role client.
- [ ] Charts are legible with no horizontal scrolling at 390px.
- [ ] `npm run lint`, `npm test` and `npm run build` pass.

## 7. Deliberately not in this phase

- Predictive or AI-generated "relationship insights" → not planned
- "Perspective accuracy" chart from the spec → not planned (it needs a definition of accuracy the spec never gives; revisit if wanted)
- Exporting history, sharing charts → not planned
- Comparing with other couples or any cross-couple analytics → not planned (privacy)
- Realtime chart updates → not planned
