import { describe, expect, it } from "vitest";
import { resolveView, stageView } from "./verdict-view";

describe("verdict views", () => {
  it("maps each stage to its screen", () => {
    expect(stageView("VERDICT")).toBe("verdict");
    expect(stageView("RECOMMENDATIONS")).toBe("advice");
    expect(stageView("REPORT")).toBe("report");
  });

  it("lets a couple look back at screens they've reached", () => {
    expect(resolveView("REPORT", "verdict")).toBe("verdict");
    expect(resolveView("REPORT", "advice")).toBe("advice");
    expect(resolveView("RECOMMENDATIONS", "verdict")).toBe("verdict");
  });

  it("never skips ahead, and ignores junk", () => {
    expect(resolveView("VERDICT", "report")).toBe("verdict");
    expect(resolveView("RECOMMENDATIONS", "report")).toBe("advice");
    expect(resolveView("REPORT", "nope")).toBe("report");
    expect(resolveView("REPORT", undefined)).toBe("report");
  });
});
