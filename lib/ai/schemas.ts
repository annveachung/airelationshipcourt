// No server-only import: pure and unit-tested. Schemas are deliberately SHALLOW —
// Qwen's JSON gets less reliable the deeper the nesting goes.
import { z } from "zod";

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
