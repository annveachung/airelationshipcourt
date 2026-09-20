import { NextResponse } from "next/server";
import { aiConfigured } from "@/lib/ai/client";
import { runAnalysisStep, runPanelStep } from "@/lib/cases/pipeline";
import { setCaseError } from "@/lib/cases/state-machine";
import { createClient } from "@/lib/supabase/server";

// Analysis, the three panel members and the verdict can take a while on a slow model.
export const maxDuration = 60;
export const runtime = "nodejs";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Driven by the waiting screen's poller: "do the next AI step for this case, if one is due".
// Safe to call from both partners at once — the ai_runs claim lets only one run happen.
export async function POST(request: Request, ctx: RouteContext<"/api/cases/[caseId]/advance">) {
  const { caseId } = await ctx.params;
  if (!UUID.test(caseId)) return NextResponse.json({ error: "not_found" }, { status: 404 });

  // Who is asking? Only members of this case's couple may drive it.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data } = await supabase.rpc("case_submission_status", { the_case: caseId });
  const row = (data as { stage: string; failed: boolean }[] | null)?.[0];
  if (!row) return NextResponse.json({ error: "not_found" }, { status: 404 });

  // The two stages that do AI work. Anything else has nothing to advance.
  if (row.stage !== "ANALYSIS" && row.stage !== "PANEL_JUDGEMENT") {
    return NextResponse.json({ stage: row.stage, status: "idle" });
  }

  const body = (await request.json().catch(() => ({}))) as { retry?: boolean };
  if (row.failed && !body.retry) {
    // Don't loop on a failure: wait for an explicit Retry.
    return NextResponse.json({ stage: row.stage, status: "failed" });
  }

  if (!aiConfigured()) {
    await setCaseError(caseId, "not_configured");
    return NextResponse.json({ stage: row.stage, status: "failed" });
  }
  if (row.failed) await setCaseError(caseId, null);

  if (row.stage === "ANALYSIS") {
    const result = await runAnalysisStep(caseId);
    return NextResponse.json({
      stage: result === "advanced" ? "FOLLOW_UP" : row.stage,
      status: result,
    });
  }

  const result = await runPanelStep(caseId);
  return NextResponse.json({
    stage: result === "advanced" ? "VERDICT" : row.stage,
    status: result,
  });
}
