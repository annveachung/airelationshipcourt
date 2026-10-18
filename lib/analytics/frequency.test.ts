import { describe, expect, it } from "vitest";
import { frequencyOf } from "./frequency";

describe("frequencyOf", () => {
  it("turns a count into a share of cases and a level", () => {
    expect(frequencyOf(1, 10)).toEqual({ percent: 10, level: "rarely" });
    expect(frequencyOf(2, 10)).toEqual({ percent: 20, level: "sometimes" });
    expect(frequencyOf(4, 10)).toEqual({ percent: 40, level: "often" });
    expect(frequencyOf(3, 3)).toEqual({ percent: 100, level: "often" });
  });

  it("rounds to whole percent and handles no cases", () => {
    expect(frequencyOf(1, 3)).toEqual({ percent: 33, level: "sometimes" });
    expect(frequencyOf(0, 0)).toEqual({ percent: 0, level: "rarely" });
  });
});
