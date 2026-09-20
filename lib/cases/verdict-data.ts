// SERVER ONLY. Everything the verdict, advice, report and closing screens need, in one place,
// so the case page and the report page can't drift apart. All reads go through the normal
// (Row Level Security) client: partners see this data only from VERDICT on.
import "server-only";
import { reportTextsSchema, verdictTextsSchema, type ReportTexts, type VerdictTexts } from "@/lib/ai/schemas";
import type { PanelRole, PanelScores } from "@/lib/cases/aggregate";
import type { VerdictCharges } from "@/lib/cases/charges";
import type { TestimonyView } from "@/components/court/testimonies-view";
import type { Locale } from "@/lib/i18n";
import type { createClient } from "@/lib/supabase/server";

type Db = Awaited<ReturnType<typeof createClient>>;

export type Signature = { userId: string; clauses: string[] };

export type VerdictBundle = {
  verdict: {
    finalA: number;
    finalB: number;
    moreResponsible: "partner_a" | "partner_b";
    decidedBy: "percentage" | "jury" | "fallback";
    charges: VerdictCharges;
  } | null;
  verdictTexts: VerdictTexts | null;
  needsVerdictTranslation: boolean;
  reportTexts: ReportTexts | null;
  reportReady: boolean; // the English report exists
  needsReportTranslation: boolean;
  panel: Partial<Record<PanelRole, { a: number; b: number }>>;
  panelScores: PanelScores | null; // only when all three members are present
  panelSummaryDone: boolean;
  testimonies: (Omit<TestimonyView, "name"> & { user_id: string })[];
  signatures: Signature[];
};

export async function loadVerdictBundle(db: Db, caseId: string, locale: Locale): Promise<VerdictBundle> {
  const [verdictRes, vTextRes, rTextRes, panelRes, testimonyRes, signatureRes] =
    await Promise.all([
      db.from("verdicts").select("*").eq("case_id", caseId).maybeSingle(),
      db.from("verdict_texts").select("locale, content").eq("case_id", caseId),
      db.from("report_texts").select("locale, content").eq("case_id", caseId),
      db.from("panel_assessments").select("role, responsibility_partner_a, responsibility_partner_b").eq("case_id", caseId),
      db
        .from("testimonies")
        .select(
          "user_id, what_happened, frequency, causes, cause_note, emotions, severity, partner_did_wrong, needs, needs_note",
        )
        .eq("case_id", caseId),
      db.from("treaty_signatures").select("user_id, clauses").eq("case_id", caseId),
    ]);

  // Prefer the viewer's language; fall back to English until a translation exists.
  const pick = <T>(rows: { locale: string; content: unknown }[] | null, parse: (c: unknown) => T | null) => {
    const mine = parse(rows?.find((r) => r.locale === locale)?.content);
    const english = parse(rows?.find((r) => r.locale === "en")?.content);
    return { mine, english, value: mine ?? english };
  };
  const vParse = (c: unknown) => (c ? (verdictTextsSchema.safeParse(c).data ?? null) : null);
  const rParse = (c: unknown) => (c ? (reportTextsSchema.safeParse(c).data ?? null) : null);
  const v = pick(vTextRes.data, vParse);
  const r = pick(rTextRes.data, rParse);

  const panel = Object.fromEntries(
    (panelRes.data ?? []).map((p) => [
      p.role,
      { a: Number(p.responsibility_partner_a), b: Number(p.responsibility_partner_b) },
    ]),
  ) as Partial<Record<PanelRole, { a: number; b: number }>>;
  const panelScores = (["jury", "family_counsellor", "social_worker"] as const).every((k) => panel[k])
    ? (panel as PanelScores)
    : null;

  const vr = verdictRes.data;
  return {
    verdict: vr
      ? {
          finalA: Number(vr.final_responsibility_a),
          finalB: Number(vr.final_responsibility_b),
          moreResponsible: vr.more_responsible,
          decidedBy: vr.decided_by,
          charges: vr.charges as VerdictCharges,
        }
      : null,
    verdictTexts: v.value,
    needsVerdictTranslation: locale !== "en" && !v.mine && !!v.english,
    reportTexts: r.value,
    reportReady: !!r.english,
    needsReportTranslation: locale !== "en" && !r.mine && !!r.english,
    panel,
    panelScores,
    panelSummaryDone: !!v.value,
    testimonies: (testimonyRes.data ?? []) as VerdictBundle["testimonies"],
    signatures: (signatureRes.data ?? []).map((s) => ({ userId: s.user_id, clauses: s.clauses as string[] })),
  };
}
