import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import type { CaseStage } from "./stages";

// Each stage may only move to the next one. There is no going back.
const ALLOWED: Record<CaseStage, CaseStage[]> = {
  CASE_OPEN: ["TESTIMONY"],
  TESTIMONY: ["ANALYSIS"],
  ANALYSIS: ["FOLLOW_UP"],
  FOLLOW_UP: ["PANEL_JUDGEMENT"],
  PANEL_JUDGEMENT: ["VERDICT"],
  VERDICT: ["RECOMMENDATIONS"],
  RECOMMENDATIONS: ["REPORT"],
  REPORT: ["CLOSED"],
  CLOSED: [],
};

/**
 * The ONLY code in the app allowed to change `cases.stage`.
 *
 * Compare-and-swap: the update only happens if the case is still in `from`.
 * Returns false when someone else already advanced it (normal when both
 * partners act at the same moment) — that is not an error.
 */
export async function transition(caseId: string, from: CaseStage, to: CaseStage): Promise<boolean> {
  if (!ALLOWED[from].includes(to)) {
    throw new Error(`Illegal case transition: ${from} -> ${to}`);
  }

  const now = new Date().toISOString();
  const { data, error } = await createServiceClient()
    .from("cases")
    .update({
      stage: to,
      stage_entered_at: now,
      updated_at: now,
      last_error: null,
      ...(to === "CLOSED" ? { closed_at: now } : {}),
    })
    .eq("id", caseId)
    .eq("stage", from)
    .select("id");

  if (error) {
    console.error("transition failed:", caseId, from, "->", to, error.message);
    throw new Error("Could not update the case.");
  }
  return (data?.length ?? 0) > 0;
}
