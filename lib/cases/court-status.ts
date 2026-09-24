// Pure and unit-tested (no server-only): what the Court Status panel shows, worked out from the
// status row that the poll returns. The row holds booleans, states and COARSE labels only.
import { INTENSITY_LEVEL, type IntensityBand } from "./intensity";

export { INTENSITY_LEVEL, type IntensityBand };
import { CASE_STAGES, type CaseStage } from "./stages";

export type PanelState = "waiting" | "working" | "ready";

export type CourtStatus = {
  stage: CaseStage;
  aSubmitted: boolean;
  bSubmitted: boolean;
  aFollowedUp: boolean;
  bFollowedUp: boolean;
  failed: boolean;
  aSigned: boolean;
  bSigned: boolean;
  reportReady: boolean;
  juryState: PanelState;
  counsellorState: PanelState;
  socialWorkerState: PanelState;
  primaryIssue: string | null;
  secondaryIssue: string | null;
  conflictType: string | null;
  intensityBand: IntensityBand | null;
};

// The raw row returned by the court_status() database function.
export type CourtStatusRow = {
  stage: CaseStage;
  a_submitted: boolean;
  b_submitted: boolean;
  a_followed_up: boolean;
  b_followed_up: boolean;
  failed: boolean;
  a_signed: boolean;
  b_signed: boolean;
  report_ready: boolean;
  jury_state: PanelState;
  counsellor_state: PanelState;
  social_worker_state: PanelState;
  primary_issue: string | null;
  secondary_issue: string | null;
  conflict_type: string | null;
  intensity_band: IntensityBand | null;
};

export function toCourtStatus(row: CourtStatusRow): CourtStatus {
  return {
    stage: row.stage,
    aSubmitted: row.a_submitted,
    bSubmitted: row.b_submitted,
    aFollowedUp: row.a_followed_up,
    bFollowedUp: row.b_followed_up,
    failed: row.failed,
    aSigned: row.a_signed,
    bSigned: row.b_signed,
    reportReady: row.report_ready,
    juryState: row.jury_state,
    counsellorState: row.counsellor_state,
    socialWorkerState: row.social_worker_state,
    primaryIssue: row.primary_issue,
    secondaryIssue: row.secondary_issue,
    conflictType: row.conflict_type,
    intensityBand: row.intensity_band,
  };
}

const at = (stage: CaseStage, other: CaseStage) => CASE_STAGES.indexOf(stage) >= CASE_STAGES.indexOf(other);
const count = (...flags: boolean[]) => flags.filter(Boolean).length;

/** How far along the trial is, 0-100, with partial credit inside a stage. */
export function trialProgress(s: CourtStatus): number {
  switch (s.stage) {
    case "CASE_OPEN":
      return 5;
    case "TESTIMONY":
      return 10 + 7.5 * count(s.aSubmitted, s.bSubmitted);
    case "ANALYSIS":
      return 30;
    case "FOLLOW_UP":
      return 40 + 5 * count(s.aFollowedUp, s.bFollowedUp);
    case "PANEL_JUDGEMENT":
      return 55 + 5 * [s.juryState, s.counsellorState, s.socialWorkerState].filter((p) => p === "ready").length;
    case "VERDICT":
      return 85;
    case "RECOMMENDATIONS":
      return 90;
    case "REPORT":
      return 92 + 3 * count(s.aSigned, s.bSigned);
    case "CLOSED":
      return 100;
  }
}

export type ChecklistState = "done" | "current" | "todo";
export type ChecklistItem =
  | { key: "testified"; who: "a" | "b"; state: ChecklistState }
  | { key: "analysis" | "followUp" | "panel" | "verdict" | "treaty"; state: ChecklistState };

/** The ✓ / ● / ○ list of steps. */
export function buildChecklist(s: CourtStatus): ChecklistItem[] {
  const step = (done: boolean, current: boolean): ChecklistState => (done ? "done" : current ? "current" : "todo");
  const testifying = s.stage === "TESTIMONY" || s.stage === "CASE_OPEN";
  return [
    { key: "testified", who: "a", state: step(s.aSubmitted, testifying && !s.aSubmitted) },
    { key: "testified", who: "b", state: step(s.bSubmitted, testifying && !s.bSubmitted) },
    { key: "analysis", state: step(at(s.stage, "FOLLOW_UP"), s.stage === "ANALYSIS") },
    { key: "followUp", state: step(at(s.stage, "PANEL_JUDGEMENT"), s.stage === "FOLLOW_UP") },
    { key: "panel", state: step(at(s.stage, "VERDICT"), s.stage === "PANEL_JUDGEMENT") },
    { key: "verdict", state: step(at(s.stage, "RECOMMENDATIONS"), s.stage === "VERDICT") },
    { key: "treaty", state: step(s.stage === "CLOSED", s.stage === "REPORT") },
  ];
}
