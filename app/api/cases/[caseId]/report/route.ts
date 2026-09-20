import { NextResponse } from "next/server";
import { aiConfigured } from "@/lib/ai/client";
import { ensureReport, ensureTranslation } from "@/lib/cases/pipeline";
import { CASE_STAGES, type CaseStage } from "@/lib/cases/stages";
import { isLocale } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 60;
export const runtime = "nodejs";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Writes the case report in the background while partners read the verdict, then translates
// it for the caller's language. Idempotent: the ai_runs claim lets only one run happen.
export async function POST(request: Request, ctx: RouteContext<"/api/cases/[caseId]/report">) {
  const { caseId } = await ctx.params;
  if (!UUID.test(caseId)) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data } = await supabase.rpc("case_submission_status", { the_case: caseId });
  const row = (data as { stage: CaseStage }[] | null)?.[0];
  if (!row) return NextResponse.json({ error: "not_found" }, { status: 404 });

  // Only once the verdict exists.
  if (CASE_STAGES.indexOf(row.stage) < CASE_STAGES.indexOf("VERDICT")) {
    return NextResponse.json({ status: "not_ready" }, { status: 409 });
  }

  const { locale } = (await request.json().catch(() => ({}))) as { locale?: string };
  if (!isLocale(locale)) return NextResponse.json({ error: "invalid" }, { status: 400 });
  if (!aiConfigured()) return NextResponse.json({ status: "failed" });

  const english = await ensureReport(caseId);
  if (english !== "ok") return NextResponse.json({ status: english });

  const translated = await ensureTranslation(caseId, locale, "report");
  return NextResponse.json({ status: translated });
}
