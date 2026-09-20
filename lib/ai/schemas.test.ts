import { describe, expect, it } from "vitest";
import { ANALYSIS_EXAMPLE } from "./prompts/analysis";
import { QUESTIONS_EXAMPLE } from "./prompts/follow-up";
import { analysisSchema, questionsSchema } from "./schemas";

const q = (format: string, extra: object = {}) => ({
  question_text: "Did it happen?",
  format,
  topic: "a topic",
  ...extra,
});
const mc = () => q("multiple_choice", { options: ["One", "Two", "Three"] });

describe("prompt examples stay in sync with the schemas", () => {
  it("analysis example parses", () => {
    expect(analysisSchema.safeParse(ANALYSIS_EXAMPLE).success).toBe(true);
  });
  it("questions example parses", () => {
    expect(questionsSchema.safeParse(QUESTIONS_EXAMPLE).success).toBe(true);
  });
});

describe("analysisSchema", () => {
  it("wraps a lone string where a list is expected", () => {
    const parsed = analysisSchema.parse({ ...ANALYSIS_EXAMPLE, topics: "just one topic" });
    expect(parsed.topics).toEqual(["just one topic"]);
  });

  it("rejects a missing field", () => {
    const { primary_issue: _omit, ...rest } = ANALYSIS_EXAMPLE;
    void _omit;
    expect(analysisSchema.safeParse(rest).success).toBe(false);
  });
});

describe("questionsSchema", () => {
  const ok = { partner_a: [mc(), q("rating_1_10"), q("short_answer")], partner_b: [mc(), mc(), q("true_false_unsure")] };

  it("accepts three questions each with at most one short answer", () => {
    expect(questionsSchema.safeParse(ok).success).toBe(true);
  });

  it("forces the true/false/unsure options", () => {
    const parsed = questionsSchema.parse(ok);
    expect(parsed.partner_b[2].options).toEqual(["True", "False", "Unsure"]);
  });

  it("drops options from rating and short-answer questions", () => {
    const parsed = questionsSchema.parse({
      ...ok,
      partner_a: [mc(), q("rating_1_10", { options: ["x"] }), q("short_answer", { options: ["y"] })],
    });
    expect(parsed.partner_a[1].options).toBeUndefined();
    expect(parsed.partner_a[2].options).toBeUndefined();
  });

  it("rejects two short answers for one partner", () => {
    const bad = { ...ok, partner_a: [mc(), q("short_answer"), q("short_answer")] };
    expect(questionsSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects the wrong number of questions", () => {
    expect(questionsSchema.safeParse({ ...ok, partner_a: [mc(), mc()] }).success).toBe(false);
    expect(questionsSchema.safeParse({ ...ok, partner_b: [mc(), mc(), mc(), mc()] }).success).toBe(false);
  });

  it("rejects multiple choice with too few or too many options", () => {
    const few = q("multiple_choice", { options: ["One", "Two"] });
    const many = q("multiple_choice", { options: ["1", "2", "3", "4", "5", "6", "7"] });
    expect(questionsSchema.safeParse({ ...ok, partner_a: [few, mc(), mc()] }).success).toBe(false);
    expect(questionsSchema.safeParse({ ...ok, partner_a: [many, mc(), mc()] }).success).toBe(false);
  });

  it("rejects an unknown format", () => {
    expect(questionsSchema.safeParse({ ...ok, partner_a: [q("essay"), mc(), mc()] }).success).toBe(false);
  });
});
