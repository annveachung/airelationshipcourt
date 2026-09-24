import { describe, expect, it } from "vitest";
import { intensityBand } from "./intensity";

describe("intensityBand", () => {
  it("matches the boundaries used in court_status() SQL: <4 low, <6 moderate, <8 high, else severe", () => {
    expect(intensityBand(1)).toBe("low");
    expect(intensityBand(3.9)).toBe("low");
    expect(intensityBand(4)).toBe("moderate");
    expect(intensityBand(5.9)).toBe("moderate");
    expect(intensityBand(6)).toBe("high");
    expect(intensityBand(7.9)).toBe("high");
    expect(intensityBand(8)).toBe("severe");
    expect(intensityBand(10)).toBe("severe");
  });
});
