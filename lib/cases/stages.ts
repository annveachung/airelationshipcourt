// Safe to import anywhere (no server-only code).
// In lifecycle order. Must match the `case_stage` enum in the database.
export const CASE_STAGES = [
  "CASE_OPEN",
  "TESTIMONY",
  "ANALYSIS",
  "FOLLOW_UP",
  "PANEL_JUDGEMENT",
  "VERDICT",
  "RECOMMENDATIONS",
  "REPORT",
  "CLOSED",
] as const;

export type CaseStage = (typeof CASE_STAGES)[number];

export const STAGE_LABELS: Record<CaseStage, string> = {
  CASE_OPEN: "Case opened",
  TESTIMONY: "Testimony",
  ANALYSIS: "Case analysis",
  FOLLOW_UP: "Follow-up round",
  PANEL_JUDGEMENT: "Panel deliberation",
  VERDICT: "Verdict ready",
  RECOMMENDATIONS: "Recommendations",
  REPORT: "Case report",
  CLOSED: "Closed",
};
