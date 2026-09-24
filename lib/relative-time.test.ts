import { describe, expect, it } from "vitest";
import { relativeTime } from "./relative-time";

const now = Date.parse("2026-09-20T12:00:00Z");
const ago = (ms: number) => new Date(now - ms).toISOString();

describe("relativeTime", () => {
  it("says just now under a minute", () => {
    expect(relativeTime(ago(20_000), "en", "just now", now)).toBe("just now");
  });
  it("formats minutes, hours and days in English", () => {
    expect(relativeTime(ago(5 * 60_000), "en", "just now", now)).toBe("5 minutes ago");
    expect(relativeTime(ago(3 * 3_600_000), "en", "just now", now)).toBe("3 hours ago");
    expect(relativeTime(ago(2 * 86_400_000), "en", "just now", now)).toBe("2 days ago");
  });
  it("formats in Traditional Chinese", () => {
    expect(relativeTime(ago(5 * 60_000), "zh-Hant", "剛剛", now)).toContain("5");
    expect(relativeTime(ago(5 * 60_000), "zh-Hant", "剛剛", now)).toContain("分鐘");
  });
});
