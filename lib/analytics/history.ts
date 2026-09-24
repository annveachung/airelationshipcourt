// SERVER. Reads go through the caller's normal (Row Level Security) client — every case here
// is already CLOSED, so both partners can read it; there is no reason to use the secret key.
import { normalizeIssue } from "@/lib/cases/taxonomy";
import type { createClient } from "@/lib/supabase/server";

type Db = Awaited<ReturnType<typeof createClient>>;

export type HistoryCase = {
  id: string;
  title: string;
  closedAt: string;
  finalA: number;
  finalB: number;
  moreResponsible: "partner_a" | "partner_b";
  primaryIssue: string | null;
};

type Row = {
  id: string;
  title: string;
  closed_at: string | null;
  created_at: string;
  verdicts: { final_responsibility_a: number; final_responsibility_b: number; more_responsible: "partner_a" | "partner_b" } | null;
  case_analyses: { primary_issue: string } | null;
};

/** The couple's finished cases, newest first. */
export async function getCoupleHistory(db: Db, coupleId: string): Promise<HistoryCase[]> {
  const { data, error } = await db
    .from("cases")
    .select(
      "id, title, closed_at, created_at, verdicts(final_responsibility_a, final_responsibility_b, more_responsible), case_analyses(primary_issue)",
    )
    .eq("couple_id", coupleId)
    .eq("stage", "CLOSED")
    .order("closed_at", { ascending: false })
    .returns<Row[]>();

  if (error) {
    console.error("getCoupleHistory failed:", error.code);
    return [];
  }

  return (data ?? [])
    .filter((row): row is Row & { verdicts: NonNullable<Row["verdicts"]> } => row.verdicts !== null)
    .map((row) => ({
      id: row.id,
      title: row.title,
      closedAt: row.closed_at ?? row.created_at,
      finalA: Number(row.verdicts.final_responsibility_a),
      finalB: Number(row.verdicts.final_responsibility_b),
      moreResponsible: row.verdicts.more_responsible,
      primaryIssue: row.case_analyses ? normalizeIssue(row.case_analyses.primary_issue) : null,
    }));
}
