// SERVER ONLY. The court's AI steps for a case, in order. Called by the
// /advance route, which has already checked that the caller belongs to the case.
import "server-only";
import { runStructured } from "@/lib/ai/run";
import { analysisMessages } from "@/lib/ai/prompts/analysis";
import { followUpMessages } from "@/lib/ai/prompts/follow-up";
import type { PartnerTestimony } from "@/lib/ai/prompts/format";
import { analysisSchema, questionsSchema, type Analysis } from "@/lib/ai/schemas";
import { isLocale, type Locale } from "@/lib/i18n";
import { createServiceClient } from "@/lib/supabase/service";
import { setCaseError, transition } from "./state-machine";

export type StepResult = "advanced" | "in_progress" | "failed";

type TestimonyRow = {
  user_id: string;
  what_happened: string;
  frequency: PartnerTestimony["frequency"];
  causes: string[];
  cause_note: string | null;
  emotions: string[];
  severity: number;
  partner_did_wrong: string;
  needs: string[];
  needs_note: string | null;
};

const toPartner = (r: TestimonyRow): PartnerTestimony => ({
  whatHappened: r.what_happened,
  frequency: r.frequency,
  causes: r.causes,
  causeNote: r.cause_note,
  emotions: r.emotions,
  severity: r.severity,
  partnerDidWrong: r.partner_did_wrong,
  needs: r.needs,
  needsNote: r.needs_note,
});

// Stored in `cases.last_error` as KEYS; the screen translates them.
const FRIENDLY = {
  invalid_output: "invalid_output",
  unavailable: "unavailable",
} as const;

async function loadCase(caseId: string) {
  const db = createServiceClient();
  const { data: theCase } = await db.from("cases").select("couple_id").eq("id", caseId).single();
  if (!theCase) return null;

  const { data: members } = await db
    .from("couple_members")
    .select("user_id, role")
    .eq("couple_id", theCase.couple_id);
  const { data: rows } = await db
    .from("testimonies")
    .select(
      "user_id, what_happened, frequency, causes, cause_note, emotions, severity, partner_did_wrong, needs, needs_note",
    )
    .eq("case_id", caseId)
    .returns<TestimonyRow[]>();

  const userA = members?.find((m) => m.role === "partner_a")?.user_id;
  const userB = members?.find((m) => m.role === "partner_b")?.user_id;
  // Each partner's language, so their questions are written in it.
  const { data: profiles } = await db.from("profiles").select("id, locale").in("id", [userA, userB].filter(Boolean) as string[]);
  const localeOf = (id: string | undefined): Locale => {
    const l = profiles?.find((p) => p.id === id)?.locale;
    return isLocale(l) ? l : "en";
  };
  const a = rows?.find((r) => r.user_id === userA);
  const b = rows?.find((r) => r.user_id === userB);
  if (!userA || !userB || !a || !b) return null;
  return {
    userA,
    userB,
    a: toPartner(a),
    b: toPartner(b),
    languages: { a: localeOf(userA), b: localeOf(userB) },
  };
}

/** ANALYSIS stage: analyse both testimonies, then write the follow-up questions. */
export async function runAnalysisStep(caseId: string): Promise<StepResult> {
  const db = createServiceClient();
  const loaded = await loadCase(caseId);
  if (!loaded) {
    await setCaseError(caseId, FRIENDLY.unavailable);
    return "failed";
  }

  // 1. Case analysis (skipped if a previous attempt already saved it).
  let analysis: Analysis;
  const { data: existing } = await db.from("case_analyses").select("*").eq("case_id", caseId).maybeSingle();
  if (existing) {
    analysis = analysisSchema.parse(existing);
  } else {
    const { system, user } = analysisMessages(loaded.a, loaded.b);
    const result = await runStructured({ caseId, stage: "analysis", schema: analysisSchema, system, user });
    if (result.kind === "in_progress") return "in_progress";
    if (result.kind === "failed") {
      await setCaseError(caseId, FRIENDLY[result.reason]);
      return "failed";
    }
    analysis = result.data;
    const { error } = await db.from("case_analyses").upsert({ case_id: caseId, ...analysis });
    if (error) {
      console.error("save analysis failed:", caseId, error.code);
      await setCaseError(caseId, FRIENDLY.unavailable);
      return "failed";
    }
  }

  // 2. Follow-up questions for both partners, in one call.
  const { count } = await db
    .from("follow_up_questions")
    .select("id", { count: "exact", head: true })
    .eq("case_id", caseId);

  if (!count) {
    const { system, user } = followUpMessages(loaded.a, loaded.b, analysis, loaded.languages);
    const result = await runStructured({
      caseId,
      stage: "follow_up_questions",
      schema: questionsSchema,
      system,
      user,
      temperature: 0.5,
    });
    if (result.kind === "in_progress") return "in_progress";
    if (result.kind === "failed") {
      await setCaseError(caseId, FRIENDLY[result.reason]);
      return "failed";
    }

    const rows = (["partner_a", "partner_b"] as const).flatMap((key) =>
      result.data[key].map((q, i) => ({
        case_id: caseId,
        user_id: key === "partner_a" ? loaded.userA : loaded.userB,
        position: i + 1,
        question_text: q.question_text,
        format: q.format,
        options: q.options ?? null,
        topic: q.topic,
      })),
    );
    const { error } = await db
      .from("follow_up_questions")
      .upsert(rows, { onConflict: "case_id,user_id,round,position", ignoreDuplicates: true });
    if (error) {
      console.error("save questions failed:", caseId, error.code);
      await setCaseError(caseId, FRIENDLY.unavailable);
      return "failed";
    }
  }

  await setCaseError(caseId, null);
  await transition(caseId, "ANALYSIS", "FOLLOW_UP");
  return "advanced";
}
