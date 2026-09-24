import { describe, expect, it } from "vitest";
import en from "@/messages/en.json";
import zh from "@/messages/zh-Hant.json";
import { isNotificationType, notificationHref, NOTIFICATION_TYPES } from "./notification-types";

describe("notification types", () => {
  it("have playful and plain wording in both languages", () => {
    for (const type of NOTIFICATION_TYPES) {
      for (const messages of [en, zh]) {
        expect(messages.notifications.playful[type], `playful ${type}`).toBeTruthy();
        expect(messages.notifications.plain[type], `plain ${type}`).toBeTruthy();
      }
    }
  });
  it("recognises only known types", () => {
    expect(isNotificationType("verdict_ready")).toBe(true);
    expect(isNotificationType("made_up")).toBe(false);
  });
  it("links to the case, or the Docket when there is none", () => {
    expect(notificationHref("abc")).toBe("/cases/abc");
    expect(notificationHref(null)).toBe("/");
  });
});
