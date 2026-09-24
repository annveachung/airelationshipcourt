import { NextResponse } from "next/server";
import { toCourtStatus, type CourtStatusRow } from "@/lib/cases/court-status";
import { createClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Polled by the case page (one poll feeds both the waiting screens and the Court Status panel).
// Returns ONLY booleans, states and coarse labels — never testimony, never an exact severity.
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
  const { data } = await supabase.rpc("court_status", { the_case: caseId });
  const row = (data as CourtStatusRow[] | null)?.[0];
  if (!row) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json(toCourtStatus(row), { headers: { "Cache-Control": "no-store" } });
}
