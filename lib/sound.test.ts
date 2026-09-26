import { describe, expect, it } from "vitest";
import { shouldPlayNotifySound } from "./sound";

describe("shouldPlayNotifySound", () => {
  it("never pings on the first load, even if there are already unread notifications", () => {
    expect(shouldPlayNotifySound(null, 0)).toBe(false);
    expect(shouldPlayNotifySound(null, 3)).toBe(false);
  });
  it("pings when the unread count increases", () => {
    expect(shouldPlayNotifySound(0, 1)).toBe(true);
    expect(shouldPlayNotifySound(2, 5)).toBe(true);
  });
  it("does not ping when the count stays the same or drops (e.g. after marking read)", () => {
    expect(shouldPlayNotifySound(3, 3)).toBe(false);
    expect(shouldPlayNotifySound(3, 0)).toBe(false);
  });
});
