import { describe, expect, it } from "vitest";
import { analysisSchema } from "@/lib/ai/schemas";
import { ANALYSIS_EXAMPLE } from "@/lib/ai/prompts/analysis";
import { CONFLICT_TYPES, ISSUE_CATEGORIES, normalizeConflictType, normalizeIssue } from "./taxonomy";

describe("normalizeIssue", () => {
  it("keeps exact labels, ignoring case and spaces", () => {
    expect(normalizeIssue("Communication")).toBe("Communication");
    expect(normalizeIssue("  trust ")).toBe("Trust");
    expect(normalizeIssue("TIME AND PRIORITIES")).toBe("Time and priorities");
  });
  it("maps a model's own wording to the closest label", () => {
    expect(normalizeIssue("Poor communication")).toBe("Communication");
    expect(normalizeIssue("Unmet expectations")).toBe("Expectations");
    expect(normalizeIssue("Assuming bad intent")).toBe("Assumptions");
    expect(normalizeIssue("Work stress")).toBe("Stress");
    expect(normalizeIssue("Household chores")).toBe("Chores or money");
    expect(normalizeIssue("In-laws")).toBe("Family or friends");
  });
  it("falls back to Other", () => {
    expect(normalizeIssue("Something entirely different")).toBe("Other");
    expect(normalizeIssue("")).toBe("Other");
  });
  it("always returns a known label", () => {
    for (const raw of ["a", "xyz", "Trust issues", "late again"]) {
      expect(ISSUE_CATEGORIES).toContain(normalizeIssue(raw));
    }
  });
});

describe("normalizeConflictType", () => {
  it("maps common wording", () => {
    expect(normalizeConflictType("A misunderstanding")).toBe("Misunderstanding");
    expect(normalizeConflictType("Recurring issue")).toBe("Recurring pattern");
    expect(normalizeConflictType("Clash of priorities")).toBe("Clash of priorities");
    expect(normalizeConflictType("Broken promise")).toBe("Broken promise");
    expect(normalizeConflictType("Different personalities")).toBe("Different styles");
  });
  it("falls back to Other", () => {
    expect(normalizeConflictType("???")).toBe("Other");
    expect(CONFLICT_TYPES).toContain(normalizeConflictType("whatever"));
  });
});

describe("analysisSchema uses the fixed lists", () => {
  it("maps free-text labels onto them", () => {
    const parsed = analysisSchema.parse({
      ...ANALYSIS_EXAMPLE,
      primary_issue: "Poor communication about plans",
      secondary_issue: "Work stress",
      conflict_type: "A misunderstanding",
    });
    expect(parsed.primary_issue).toBe("Communication");
    expect(parsed.secondary_issue).toBe("Stress");
    expect(parsed.conflict_type).toBe("Misunderstanding");
  });
  it("still requires the fields to be present", () => {
    const { primary_issue: _omit, ...rest } = ANALYSIS_EXAMPLE;
    void _omit;
    expect(analysisSchema.safeParse(rest).success).toBe(false);
  });
});
