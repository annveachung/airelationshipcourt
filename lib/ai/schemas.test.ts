import { describe, expect, it } from "vitest";
import { ANALYSIS_EXAMPLE } from "./prompts/analysis";
import { QUESTIONS_EXAMPLE } from "./prompts/follow-up";
import { PANEL_EXAMPLE } from "./prompts/panel";
import { SYNTHESIS_EXAMPLE } from "./prompts/synthesis";
import {
  analysisSchema,
  panelAssessmentSchema,
  questionsSchema,
  synthesisSchema,
  translationSchemaFor,
  VERDICT_TEXT_KEYS,
  verdictTextsSchema,
} from "./schemas";

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

describe("panel and synthesis prompt examples stay in sync", () => {
  it("panel example parses", () => {
    expect(panelAssessmentSchema.safeParse(PANEL_EXAMPLE).success).toBe(true);
  });
  it("synthesis example parses", () => {
    expect(synthesisSchema.safeParse(SYNTHESIS_EXAMPLE).success).toBe(true);
  });
});

describe("panelAssessmentSchema", () => {
  it("accepts scores as numbers, strings and percentages, and clamps them", () => {
    const parsed = panelAssessmentSchema.parse({
      ...PANEL_EXAMPLE,
      responsibility_partner_a: "45%",
      responsibility_partner_b: "130",
    });
    expect(parsed.responsibility_partner_a).toBe(45);
    expect(parsed.responsibility_partner_b).toBe(100);
  });
  it("rejects a missing score or non-numeric text", () => {
    const { responsibility_partner_a: _omit, ...rest } = PANEL_EXAMPLE;
    void _omit;
    expect(panelAssessmentSchema.safeParse(rest).success).toBe(false);
    expect(panelAssessmentSchema.safeParse({ ...PANEL_EXAMPLE, responsibility_partner_b: "lots" }).success).toBe(false);
  });
  it("wraps a lone recommendation string", () => {
    const parsed = panelAssessmentSchema.parse({ ...PANEL_EXAMPLE, recommendations: "Talk more" });
    expect(parsed.recommendations).toEqual(["Talk more"]);
  });
});

describe("synthesisSchema", () => {
  it("rejects charge ids that aren't in the fixed list", () => {
    expect(synthesisSchema.safeParse({ ...SYNTHESIS_EXAMPLE, charge_ids_a: ["made_up_charge"] }).success).toBe(false);
  });
  it("needs at least one and at most two charge ids per group", () => {
    expect(synthesisSchema.safeParse({ ...SYNTHESIS_EXAMPLE, charge_ids_b: [] }).success).toBe(false);
    expect(
      synthesisSchema.safeParse({
        ...SYNTHESIS_EXAMPLE,
        charge_ids_both: ["interrupting", "score_keeping", "mind_reading"],
      }).success,
    ).toBe(false);
  });
  it("accepts a single charge id given as a string", () => {
    expect(synthesisSchema.parse({ ...SYNTHESIS_EXAMPLE, charge_ids_both: "interrupting" }).charge_ids_both).toEqual([
      "interrupting",
    ]);
  });
});

describe("translationSchemaFor", () => {
  const original = verdictTextsSchema.parse(
    Object.fromEntries(VERDICT_TEXT_KEYS.map((k) => [k, k === "verdict_text" ? "[[A]] and [[B]] argued." : "text"])),
  );

  it("accepts a translation that keeps the placeholders", () => {
    const translated = { ...original, verdict_text: "[[A]] 和 [[B]] 吵了一架。" };
    expect(translationSchemaFor(original).safeParse(translated).success).toBe(true);
  });
  it("rejects a translation that loses a placeholder", () => {
    const translated = { ...original, verdict_text: "山姆和 [[B]] 吵了一架。" };
    expect(translationSchemaFor(original).safeParse(translated).success).toBe(false);
  });
  it("rejects a translation with a missing key", () => {
    const { joint_feedback: _omit, ...rest } = original;
    void _omit;
    expect(translationSchemaFor(original).safeParse(rest).success).toBe(false);
  });
});
