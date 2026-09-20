// No server-only import: pure and unit-tested. Schemas are deliberately SHALLOW —
// Qwen's JSON gets less reliable the deeper the nesting goes.
import { z } from "zod";
import { CHARGE_IDS, type ChargeId } from "@/lib/cases/charges";
import { placeholdersIn } from "./names";

// Models sometimes return a lone string where a list is expected.
const list = (maxItems: number, maxLength: number) =>
  z.preprocess(
    (v) => (typeof v === "string" ? [v] : v),
    z.array(z.string().trim().min(1).max(maxLength)).max(maxItems),
  );

const short = (max: number) => z.string().trim().min(1).max(max);

export const analysisSchema = z.object({
  topics: list(8, 120),
  emotions: list(10, 120),
  discrepancies: list(8, 300),
  expectations: list(8, 200),
  potential_causes: list(8, 200),
  conflict_patterns: list(6, 200),
  follow_up_topics: list(6, 200),
  primary_issue: short(80),
  secondary_issue: short(80),
  conflict_type: short(80),
});
export type Analysis = z.infer<typeof analysisSchema>;

export const QUESTION_FORMATS = [
  "multiple_choice",
  "true_false_unsure",
  "rating_1_10",
  "short_answer",
] as const;
export type QuestionFormat = (typeof QUESTION_FORMATS)[number];

export const TRUE_FALSE_UNSURE = ["True", "False", "Unsure"] as const;

const questionSchema = z
  .object({
    question_text: short(200),
    format: z.enum(QUESTION_FORMATS),
    options: z.array(z.string().trim().min(1).max(60)).max(8).optional(),
    topic: short(120),
  })
  .transform((q) => {
    // Normalise options per format so the rest of the app can rely on them.
    if (q.format === "true_false_unsure") return { ...q, options: [...TRUE_FALSE_UNSURE] };
    if (q.format === "multiple_choice") return q;
    return { ...q, options: undefined };
  })
  .refine((q) => q.format !== "multiple_choice" || (q.options?.length ?? 0) >= 3, {
    message: "multiple_choice needs 3 to 6 options",
  })
  .refine((q) => q.format !== "multiple_choice" || (q.options?.length ?? 0) <= 6, {
    message: "multiple_choice needs 3 to 6 options",
  });
export type FollowUpQuestion = z.infer<typeof questionSchema>;

// Exactly 3 questions per partner; at most one open answer, so at least two quick-picks.
const partnerQuestions = z
  .array(questionSchema)
  .length(3)
  .refine((qs) => qs.filter((q) => q.format === "short_answer").length <= 1, {
    message: "at most 1 short_answer question per partner",
  });

export const questionsSchema = z.object({
  partner_a: partnerQuestions,
  partner_b: partnerQuestions,
});
export type FollowUpQuestions = z.infer<typeof questionsSchema>;

// ---------------------------------------------------------------------------
// Phase 5: panel assessments, the verdict synthesis, and its translations.
// All flat (no nesting beyond simple lists) because Qwen's JSON is shakier when deep.
// ---------------------------------------------------------------------------

// Scores can arrive as 60, "60" or "60%"; keep them in 0-100.
const score = z.preprocess(
  (v) => (typeof v === "string" ? Number.parseFloat(v.replace("%", "")) : v),
  z.number().finite().transform((n) => Math.min(100, Math.max(0, n))),
);

export const panelAssessmentSchema = z.object({
  responsibility_partner_a: score,
  responsibility_partner_b: score,
  primary_issue: short(80),
  secondary_issues: list(3, 80),
  reasoning_summary: short(700),
  feedback_partner_a: short(400),
  feedback_partner_b: short(400),
  recommendations: list(3, 200),
});
export type PanelAssessment = z.infer<typeof panelAssessmentSchema>;

const chargeIds = (max: number) =>
  z.preprocess(
    (v) => (typeof v === "string" ? [v] : v),
    z.array(z.enum(CHARGE_IDS)).min(1).max(max),
  );

export const synthesisSchema = z.object({
  verdict_text: short(700),
  primary_issue: short(200),
  underlying_issue: short(200),
  main_escalation_factor: short(200),
  biggest_misunderstanding: short(400),
  feedback_partner_a: short(400),
  feedback_partner_b: short(400),
  joint_feedback: short(400),
  suggestion_partner_a: short(300),
  suggestion_partner_b: short(300),
  suggestion_together: short(300),
  charge_ids_a: chargeIds(2),
  charge_custom_a: short(80),
  charge_ids_b: chargeIds(2),
  charge_custom_b: short(80),
  charge_ids_both: chargeIds(2),
});
export type Synthesis = z.infer<typeof synthesisSchema>;

// Everything a person reads, in ONE language. English is assembled from the synthesis and
// the panel; other languages come from translating this same shape.
export const VERDICT_TEXT_KEYS = [
  "verdict_text",
  "primary_issue",
  "underlying_issue",
  "main_escalation_factor",
  "biggest_misunderstanding",
  "feedback_partner_a",
  "feedback_partner_b",
  "joint_feedback",
  "suggestion_partner_a",
  "suggestion_partner_b",
  "suggestion_together",
  "charge_custom_a",
  "charge_custom_b",
  "summary_jury",
  "summary_family_counsellor",
  "summary_social_worker",
] as const;
export type VerdictTextKey = (typeof VERDICT_TEXT_KEYS)[number];

export const verdictTextsSchema = z.object(
  Object.fromEntries(VERDICT_TEXT_KEYS.map((k) => [k, short(800)])) as Record<VerdictTextKey, z.ZodString>,
);
export type VerdictTexts = z.infer<typeof verdictTextsSchema>;

/** Builds a schema for a translation: every key present, and the [[A]]/[[B]] placeholders kept. */
export function makeTranslationSchema<K extends string>(keys: readonly K[], original: Record<K, string>) {
  const shape = Object.fromEntries(keys.map((k) => [k, short(800)])) as Record<K, z.ZodString>;
  return z.object(shape).superRefine((translated, ctx) => {
    for (const key of keys) {
      const want = placeholdersIn(original[key]);
      const got = placeholdersIn((translated as Record<K, string>)[key]);
      for (const p of want) {
        if (!got.has(p)) {
          ctx.addIssue({ code: "custom", path: [key], message: `lost the [[${p}]] placeholder` });
        }
      }
    }
  });
}

/** A verdict translation. */
export function translationSchemaFor(original: VerdictTexts) {
  return makeTranslationSchema(VERDICT_TEXT_KEYS, original);
}

// ---------------------------------------------------------------------------
// Phase 6: the written report and the personalised treaty clauses (flat strings).
// List-like fields are newline-separated so they stay flat and translate cleanly.
// ---------------------------------------------------------------------------

export const REPORT_TEXT_KEYS = [
  "case_summary",
  "primary_conflict",
  "secondary_issues",
  "emotional_themes",
  "key_discrepancies",
  "follow_up_findings",
  "treaty_personal_1",
  "treaty_personal_2",
  "treaty_personal_3",
] as const;
export type ReportTextKey = (typeof REPORT_TEXT_KEYS)[number];

// Models sometimes return a list where a newline-separated string is wanted.
const multiline = (max: number) =>
  z.preprocess(
    (v) => (Array.isArray(v) ? v.map(String).join("\n") : v),
    z.string().trim().min(1).max(max),
  );

export const reportTextsSchema = z.object({
  case_summary: short(700),
  primary_conflict: short(200),
  secondary_issues: multiline(300),
  emotional_themes: multiline(500),
  key_discrepancies: multiline(700),
  follow_up_findings: multiline(700),
  treaty_personal_1: short(220),
  treaty_personal_2: short(220),
  treaty_personal_3: short(220),
});
export type ReportTexts = z.infer<typeof reportTextsSchema>;

export function reportTranslationSchemaFor(original: ReportTexts) {
  return makeTranslationSchema(REPORT_TEXT_KEYS, original);
}

export type { ChargeId };
