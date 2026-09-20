import { describe, expect, it } from "vitest";
import type { PanelScores } from "./aggregate";
import { panelAgreement } from "./panel-agreement";

const scores = (j: [number, number], f: [number, number], s: [number, number]): PanelScores => ({
  jury: { a: j[0], b: j[1] },
  family_counsellor: { a: f[0], b: f[1] },
  social_worker: { a: s[0], b: s[1] },
});

describe("panelAgreement", () => {
  it("is unanimous when all three lean the same way", () => {
    expect(panelAgreement(scores([30, 70], [40, 60], [45, 55]))).toBe("unanimous_b");
    expect(panelAgreement(scores([70, 30], [60, 40], [55, 45]))).toBe("unanimous_a");
  });
  it("reports a 2-1 split by the majority side", () => {
    expect(panelAgreement(scores([70, 30], [60, 40], [40, 60]))).toBe("split_a");
    expect(panelAgreement(scores([30, 70], [40, 60], [60, 40]))).toBe("split_b");
  });
  it("lets an exactly level member abstain", () => {
    expect(panelAgreement(scores([50, 50], [60, 40], [40, 60]))).toBe("level");
    expect(panelAgreement(scores([50, 50], [60, 40], [55, 45]))).toBe("split_a");
  });
});
