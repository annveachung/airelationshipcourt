import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Polled by the waiting screen. Returns ONLY the stage and who has submitted (yes/no) —
// never any testimony content.
export async function GET(_request: Request, ctx: RouteContext<"/api/cases/[caseId]/status">) {
  const { caseId } = await ctx.params;
  if (!UUID.test(caseId)) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // The database function checks that the caller belongs to this case's couple.
  const { data } = await supabase.rpc("case_submission_status", { the_case: caseId });
  const row = (
    data as
      | {
          stage: string;
          a_submitted: boolean;
          b_submitted: boolean;
          a_followed_up: boolean;
          b_followed_up: boolean;
          failed: boolean;
          a_signed: boolean;
          b_signed: boolean;
          report_ready: boolean;
        }[]
      | null
  )?.[0];
  if (!row) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json(
    {
      stage: row.stage,
      aSubmitted: row.a_submitted,
      bSubmitted: row.b_submitted,
      aFollowedUp: row.a_followed_up,
      bFollowedUp: row.b_followed_up,
      failed: row.failed,
      aSigned: row.a_signed,
      bSigned: row.b_signed,
      reportReady: row.report_ready,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
