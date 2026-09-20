import { describe, expect, it } from "vitest";
import { aggregate, PANEL_WEIGHTS, type PanelScores } from "./aggregate";

const panel = (
  jury: [number, number],
  fc: [number, number],
  sw: [number, number],
): PanelScores => ({
  jury: { a: jury[0], b: jury[1] },
  family_counsellor: { a: fc[0], b: fc[1] },
  social_worker: { a: sw[0], b: sw[1] },
});

describe("aggregate", () => {
  it("averages with equal weights (the spec example: A 45 / B 55)", () => {
    const r = aggregate(panel([40, 60], [45, 55], [50, 50]));
    expect(r.finalA).toBe(45);
    expect(r.finalB).toBe(55);
    expect(r.moreResponsible).toBe("partner_b");
    expect(r.decidedBy).toBe("percentage");
  });

  it("always adds up to exactly 100", () => {
    const r = aggregate(panel([33, 67], [41, 59], [37, 63]));
    expect(r.finalA + r.finalB).toBe(100);
  });

  it("normalises scores that don't add to 100 (55/50)", () => {
    const r = aggregate(panel([55, 50], [55, 50], [55, 50]));
    expect(r.finalA).toBe(52.4);
    expect(r.finalB).toBe(47.6);
    expect(r.moreResponsible).toBe("partner_a");
  });

  it("handles a lopsided panel", () => {
    const r = aggregate(panel([10, 90], [20, 80], [15, 85]));
    expect(r.finalA).toBe(15);
    expect(r.moreResponsible).toBe("partner_b");
  });

  it("lets the Jury decide a near-tie (difference under 1 point)", () => {
    // A 50.3 / B 49.7 overall, but the Jury leans to B.
    const r = aggregate(panel([49, 51], [51, 49], [51, 49.2]));
    expect(Math.abs(r.finalA - r.finalB)).toBeLessThan(1);
    expect(r.decidedBy).toBe("jury");
    expect(r.moreResponsible).toBe("partner_b");
  });

  it("falls back to the other two members when the Jury is exactly level", () => {
    const r = aggregate(panel([50, 50], [51, 49], [50, 50]));
    expect(r.decidedBy).toBe("fallback");
    expect(r.moreResponsible).toBe("partner_a");
  });

  it("still names a winner in a perfect tie", () => {
    const r = aggregate(panel([50, 50], [50, 50], [50, 50]));
    expect(r.finalA).toBe(50);
    expect(r.finalB).toBe(50);
    expect(r.moreResponsible).toBe("partner_a");
    expect(r.decidedBy).toBe("fallback");
  });

  it("copes with all-zero scores", () => {
    const r = aggregate(panel([0, 0], [0, 0], [0, 0]));
    expect(r.finalA + r.finalB).toBe(100);
  });

  it("uses equal weights by default and honours custom weights", () => {
    expect(Object.values(PANEL_WEIGHTS)).toEqual([1, 1, 1]);
    const weighted = aggregate(panel([80, 20], [20, 80], [20, 80]), {
      jury: 3,
      family_counsellor: 1,
      social_worker: 1,
    });
    // (3*80 + 20 + 20) / 5 = 56
    expect(weighted.finalA).toBe(56);
  });
});
