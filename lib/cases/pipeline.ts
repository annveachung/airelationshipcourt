// SERVER ONLY. The court's AI steps for a case, in order. Called by the
// /advance route, which has already checked that the caller belongs to the case.
import "server-only";
import { runStructured } from "@/lib/ai/run";
import { analysisMessages } from "@/lib/ai/prompts/analysis";
import { followUpMessages } from "@/lib/ai/prompts/follow-up";
import type { FollowUpQA, PartnerTestimony } from "@/lib/ai/prompts/format";
import { panelMessages } from "@/lib/ai/prompts/panel";
import { synthesisMessages } from "@/lib/ai/prompts/synthesis";
import { translateMessages } from "@/lib/ai/prompts/translate";
import {
  analysisSchema,
  panelAssessmentSchema,
  questionsSchema,
  reportTextsSchema,
  reportTranslationSchemaFor,
  synthesisSchema,
  translationSchemaFor,
  verdictTextsSchema,
  type Analysis,
  type PanelAssessment,
  type VerdictTexts,
} from "@/lib/ai/schemas";
import { reportMessages } from "@/lib/ai/prompts/report";
import type { ZodType } from "zod";
import { aggregate, PANEL_ROLES, type PanelRole } from "./aggregate";
import { CHARGE_IDS } from "./charges";
import { isLocale, type Locale } from "@/lib/i18n";
import { createServiceClient } from "@/lib/supabase/service";
import { setCaseError, transition } from "./state-machine";

// "continue" = more work remains; the poller will call again.
export type StepResult = "advanced" | "in_progress" | "failed" | "continue";

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

// ---------------------------------------------------------------------------
// PANEL_JUDGEMENT: three independent panel members -> backend aggregation ->
// synthesis -> translations -> VERDICT. Every sub-step is saved to the database,
// so a call that runs out of time simply resumes on the next one.
// ---------------------------------------------------------------------------

const TIME_BUDGET_MS = 30_000; // don't START another long AI call after this (route limit is 60s)

async function loadFollowUps(caseId: string, userA: string, userB: string) {
  const db = createServiceClient();
  const { data: questions } = await db
    .from("follow_up_questions")
    .select("id, user_id, position, question_text, format")
    .eq("case_id", caseId)
    .order("position");
  const { data: answers } = await db
    .from("follow_up_answers")
    .select("question_id, answer_text, answer_choice, answer_rating")
    .eq("case_id", caseId);

  const toQA = (userId: string): FollowUpQA[] =>
    (questions ?? [])
      .filter((q) => q.user_id === userId)
      .map((q) => {
        const a = answers?.find((x) => x.question_id === q.id);
        const answer =
          a?.answer_rating != null ? `${a.answer_rating} out of 10` : (a?.answer_choice ?? a?.answer_text ?? "(no answer)");
        return { question: q.question_text, answer };
      });
  return { a: toQA(userA), b: toQA(userB) };
}

/** The English texts a person reads: the synthesis, the panel summaries, and the custom charges. */
function assembleEnglishTexts(s: ReturnType<typeof synthesisSchema.parse>, panel: Record<PanelRole, PanelAssessment>): VerdictTexts {
  return {
    verdict_text: s.verdict_text,
    primary_issue: s.primary_issue,
    underlying_issue: s.underlying_issue,
    main_escalation_factor: s.main_escalation_factor,
    biggest_misunderstanding: s.biggest_misunderstanding,
    feedback_partner_a: s.feedback_partner_a,
    feedback_partner_b: s.feedback_partner_b,
    joint_feedback: s.joint_feedback,
    suggestion_partner_a: s.suggestion_partner_a,
    suggestion_partner_b: s.suggestion_partner_b,
    suggestion_together: s.suggestion_together,
    charge_custom_a: s.charge_custom_a,
    charge_custom_b: s.charge_custom_b,
    summary_jury: panel.jury.reasoning_summary,
    summary_family_counsellor: panel.family_counsellor.reasoning_summary,
    summary_social_worker: panel.social_worker.reasoning_summary,
  };
}

export type TranslationKind = "verdict" | "report";

/**
 * Translates the English verdict texts (or the report texts) into `locale`.
 * Idempotent; used by the pipeline and by the lazy translate/report routes.
 */
export async function ensureTranslation(
  caseId: string,
  locale: Locale,
  kind: TranslationKind = "verdict",
): Promise<"ok" | "in_progress" | "failed"> {
  if (locale === "en") return "ok";
  const db = createServiceClient();
  const table = kind === "report" ? "report_texts" : "verdict_texts";

  const { data: have } = await db.from(table).select("locale").eq("case_id", caseId).eq("locale", locale).maybeSingle();
  if (have) return "ok";

  const { data: en } = await db.from(table).select("content").eq("case_id", caseId).eq("locale", "en").maybeSingle();
  if (!en) return "failed";

  const original = kind === "report" ? reportTextsSchema.parse(en.content) : verdictTextsSchema.parse(en.content);
  const schema = (
    kind === "report"
      ? reportTranslationSchemaFor(original as ReturnType<typeof reportTextsSchema.parse>)
      : translationSchemaFor(original as VerdictTexts)
  ) as unknown as ZodType<Record<string, string>>;

  const { system, user } = translateMessages(original as Record<string, string>, locale);
  const result = await runStructured({
    caseId,
    stage: "translation",
    // Verdict translations keep their original claim key; report translations get their own.
    subKey: kind === "report" ? `report:${locale}` : locale,
    schema,
    system,
    user,
    temperature: 0.3,
    maxTokens: 3000,
  });
  if (result.kind === "in_progress") return "in_progress";
  if (result.kind === "failed") return "failed";

  const { error } = await db.from(table).upsert({ case_id: caseId, locale, content: result.data });
  if (error) {
    console.error("save translation failed:", caseId, kind, error.code);
    return "failed";
  }
  return "ok";
}

/** Writes the English case report + personalised treaty clauses (idempotent). */
export async function ensureReport(caseId: string): Promise<"ok" | "in_progress" | "failed"> {
  const db = createServiceClient();

  const { data: have } = await db.from("report_texts").select("locale").eq("case_id", caseId).eq("locale", "en").maybeSingle();
  if (have) return "ok";

  const loaded = await loadCase(caseId);
  const [{ data: analysisRow }, { data: verdict }, { data: panelRows }] = await Promise.all([
    db.from("case_analyses").select("*").eq("case_id", caseId).maybeSingle(),
    db.from("verdicts").select("final_responsibility_a, final_responsibility_b, more_responsible").eq("case_id", caseId).maybeSingle(),
    db.from("panel_assessments").select("role, content").eq("case_id", caseId),
  ]);
  if (!loaded || !analysisRow || !verdict || !panelRows || panelRows.length < PANEL_ROLES.length) return "failed";

  const followUps = await loadFollowUps(caseId, loaded.userA, loaded.userB);
  const panelSummaries = Object.fromEntries(
    panelRows.map((r) => [r.role, String((r.content as { reasoning_summary?: string }).reasoning_summary ?? "")]),
  ) as Record<PanelRole, string>;

  const { system, user } = reportMessages({
    analysis: analysisSchema.parse(analysisRow),
    finalA: Number(verdict.final_responsibility_a),
    finalB: Number(verdict.final_responsibility_b),
    moreResponsible: verdict.more_responsible,
    panelSummaries,
    followUps,
  });
  const result = await runStructured({
    caseId,
    stage: "report",
    schema: reportTextsSchema,
    system,
    user,
    temperature: 0.7,
    maxTokens: 2500,
  });
  if (result.kind === "in_progress") return "in_progress";
  if (result.kind === "failed") return "failed";

  const { error } = await db.from("report_texts").upsert({ case_id: caseId, locale: "en", content: result.data });
  if (error) {
    console.error("save report failed:", caseId, error.code);
    return "failed";
  }
  return "ok";
}

export async function runPanelStep(caseId: string): Promise<StepResult> {
  const startedAt = Date.now();
  const db = createServiceClient();

  const loaded = await loadCase(caseId);
  const { data: analysisRow } = await db.from("case_analyses").select("*").eq("case_id", caseId).maybeSingle();
  if (!loaded || !analysisRow) {
    await setCaseError(caseId, FRIENDLY.unavailable);
    return "failed";
  }
  const analysis = analysisSchema.parse(analysisRow);

  // 1. The three panel members, in parallel. Members who already finished are skipped.
  const { data: saved } = await db.from("panel_assessments").select("role").eq("case_id", caseId);
  const done = new Set((saved ?? []).map((r) => r.role as PanelRole));
  const missing = PANEL_ROLES.filter((r) => !done.has(r));

  if (missing.length > 0) {
    const followUps = await loadFollowUps(caseId, loaded.userA, loaded.userB);
    const outcomes = await Promise.all(
      missing.map(async (role) => {
        const { system, user } = panelMessages(role, loaded.a, loaded.b, analysis, followUps);
        const result = await runStructured({
          caseId,
          stage: "panel",
          subKey: role,
          schema: panelAssessmentSchema,
          system,
          user,
          temperature: 0.6,
        });
        if (result.kind !== "ok") return result;

        const { responsibility_partner_a: a, responsibility_partner_b: b, ...content } = result.data;
        const { error } = await db.from("panel_assessments").upsert(
          {
            case_id: caseId,
            role,
            responsibility_partner_a: a,
            responsibility_partner_b: b,
            content,
            model: process.env.DASHSCOPE_MODEL ?? null,
          },
          { onConflict: "case_id,role", ignoreDuplicates: true },
        );
        if (error) console.error("save panel failed:", caseId, role, error.code);
        return error ? ({ kind: "failed", reason: "unavailable" } as const) : result;
      }),
    );

    const failed = outcomes.find((o) => o.kind === "failed");
    if (failed && failed.kind === "failed") {
      await setCaseError(caseId, FRIENDLY[failed.reason]);
      return "failed";
    }
    if (outcomes.some((o) => o.kind === "in_progress")) return "in_progress";
    if (Date.now() - startedAt > TIME_BUDGET_MS) return "continue";
  }

  // 2. Aggregate in code (never by a model) and save the numbers BEFORE any narration.
  const { data: rows } = await db.from("panel_assessments").select("role, responsibility_partner_a, responsibility_partner_b, content").eq("case_id", caseId);
  if (!rows || rows.length < PANEL_ROLES.length) return "in_progress";

  const scores = Object.fromEntries(
    rows.map((r) => [r.role, { a: Number(r.responsibility_partner_a), b: Number(r.responsibility_partner_b) }]),
  ) as Record<PanelRole, { a: number; b: number }>;
  const result = aggregate(scores);

  const { data: existingVerdict } = await db.from("verdicts").select("case_id").eq("case_id", caseId).maybeSingle();
  if (!existingVerdict) {
    const { error } = await db.from("verdicts").insert({
      case_id: caseId,
      final_responsibility_a: result.finalA,
      final_responsibility_b: result.finalB,
      more_responsible: result.moreResponsible,
      decided_by: result.decidedBy,
    });
    if (error && error.code !== "23505") {
      console.error("save verdict failed:", caseId, error.code);
      await setCaseError(caseId, FRIENDLY.unavailable);
      return "failed";
    }
  }

  // 3. Synthesis: the verdict narrative, written around the already-fixed numbers.
  const { data: enRow } = await db.from("verdict_texts").select("case_id").eq("case_id", caseId).eq("locale", "en").maybeSingle();
  if (!enRow) {
    if (Date.now() - startedAt > TIME_BUDGET_MS) return "continue";

    const assessments = Object.fromEntries(
      rows.map((r) => [
        r.role,
        panelAssessmentSchema.parse({
          responsibility_partner_a: r.responsibility_partner_a,
          responsibility_partner_b: r.responsibility_partner_b,
          ...(r.content as object),
        }),
      ]),
    ) as Record<PanelRole, PanelAssessment>;

    const { system, user } = synthesisMessages({
      assessments,
      finalA: result.finalA,
      finalB: result.finalB,
      moreResponsible: result.moreResponsible,
    });
    const synthesis = await runStructured({
      caseId,
      stage: "synthesis",
      schema: synthesisSchema,
      system,
      user,
      temperature: 0.8,
      maxTokens: 2500,
    });
    if (synthesis.kind === "in_progress") return "in_progress";
    if (synthesis.kind === "failed") {
      await setCaseError(caseId, FRIENDLY[synthesis.reason]);
      return "failed";
    }

    const s = synthesis.data;
    const validIds = new Set<string>(CHARGE_IDS);
    const clean = (ids: string[]) => ids.filter((id) => validIds.has(id));
    const { error: textError } = await db.from("verdict_texts").upsert({
      case_id: caseId,
      locale: "en",
      content: assembleEnglishTexts(s, assessments),
    });
    const { error: chargeError } = await db
      .from("verdicts")
      .update({ charges: { a: clean(s.charge_ids_a), b: clean(s.charge_ids_b), both: clean(s.charge_ids_both) } })
      .eq("case_id", caseId);
    if (textError || chargeError) {
      console.error("save synthesis failed:", caseId, textError?.code, chargeError?.code);
      await setCaseError(caseId, FRIENDLY.unavailable);
      return "failed";
    }
  }

  // 4. Translations for anyone whose language isn't English. A failure here never blocks
  //    the verdict: the page translates lazily later.
  const wanted = [...new Set([loaded.languages.a, loaded.languages.b])].filter((l) => l !== "en");
  for (const locale of wanted) {
    if (Date.now() - startedAt > TIME_BUDGET_MS) break;
    const outcome = await ensureTranslation(caseId, locale);
    if (outcome === "failed") console.error("translation failed (will retry lazily):", caseId, locale);
  }

  await setCaseError(caseId, null);
  await transition(caseId, "PANEL_JUDGEMENT", "VERDICT");
  return "advanced";
}
