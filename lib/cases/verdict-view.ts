import type { CaseStage } from "./stages";

// The screens after the verdict. The case's stage decides how far a couple has got; a "view" lets
// them look back at an earlier screen without moving the case back.
export const VERDICT_VIEWS = ["verdict", "advice", "report"] as const;
export type VerdictView = (typeof VERDICT_VIEWS)[number];

const STAGE_VIEW: Partial<Record<CaseStage, VerdictView>> = {
  VERDICT: "verdict",
  RECOMMENDATIONS: "advice",
  REPORT: "report",
  CLOSED: "report",
};

/** The screen the case is currently on. */
export function stageView(stage: CaseStage): VerdictView {
  return STAGE_VIEW[stage] ?? "verdict";
}

/** The screen to show: the requested one if the couple has already reached it, else the current one. */
export function resolveView(stage: CaseStage, requested: unknown): VerdictView {
  const current = stageView(stage);
  const wanted = VERDICT_VIEWS.find((v) => v === requested);
  return wanted && VERDICT_VIEWS.indexOf(wanted) <= VERDICT_VIEWS.indexOf(current) ? wanted : current;
}
