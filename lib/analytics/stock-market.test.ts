import { describe, expect, it } from "vitest";
import { stockMarket, whosWinning, type PeriodBucket } from "./stock-market";

const bucket = (issue: PeriodBucket["issue"], count: number, totalCases: number): PeriodBucket => ({
  issue,
  count,
  totalCases,
});

describe("stockMarket", () => {
  it("computes share and change when both periods have enough data", () => {
    const rows = stockMarket(
      [bucket("Communication", 4, 5), bucket("Trust", 1, 5)],
      [bucket("Communication", 1, 4), bucket("Trust", 2, 4)],
    );
    const comm = rows.find((r) => r.issue === "Communication")!;
    expect(comm.sharePct).toBe(80);
    expect(comm.changePct).toBeCloseTo(55, 1); // 80% - 25%
    expect(comm.arrow).toBe("up");
  });

  it("hides the change below the 3-case floor in either period", () => {
    const rows = stockMarket([bucket("Communication", 2, 2)], [bucket("Communication", 5, 6)]);
    expect(rows[0].changePct).toBeNull();
    expect(rows[0].arrow).toBeNull();
    expect(rows[0].sharePct).toBe(100); // the share itself is still shown
  });

  it("marks flat when the change is negligible", () => {
    const rows = stockMarket([bucket("Trust", 3, 10)], [bucket("Trust", 3, 10)]);
    expect(rows[0].arrow).toBe("flat");
    expect(rows[0].changePct).toBe(0);
  });

  it("shows no change for an issue that didn't appear last period", () => {
    const rows = stockMarket([bucket("Stress", 3, 10)], [bucket("Trust", 5, 10)]);
    expect(rows[0].changePct).toBeNull();
  });

  it("sorts by current share, highest first", () => {
    const rows = stockMarket(
      [bucket("Trust", 1, 10), bucket("Communication", 8, 10)],
      [bucket("Trust", 1, 10), bucket("Communication", 1, 10)],
    );
    expect(rows.map((r) => r.issue)).toEqual(["Communication", "Trust"]);
  });
});

describe("whosWinning", () => {
  it("tallies each side and ties", () => {
    expect(whosWinning(["partner_a", "partner_b", "partner_a", "tie"])).toEqual({ a: 2, b: 1, ties: 1 });
  });
  it("handles no cases", () => {
    expect(whosWinning([])).toEqual({ a: 0, b: 0, ties: 0 });
  });
});
