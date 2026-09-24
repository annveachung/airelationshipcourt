import { describe, expect, it } from "vitest";
import { appendSpoken, SPEECH_LANG } from "./voice";

describe("appendSpoken", () => {
  it("starts an empty field with the spoken text", () => {
    expect(appendSpoken("", "  hello there ", 100)).toBe("hello there");
  });
  it("joins English with a space", () => {
    expect(appendSpoken("We argued", "about dinner", 100)).toBe("We argued about dinner");
    expect(appendSpoken("We argued   ", "about dinner", 100)).toBe("We argued about dinner");
  });
  it("joins Chinese without a space", () => {
    expect(appendSpoken("我們吵架了", "因為晚餐", 100)).toBe("我們吵架了因為晚餐");
  });
  it("respects the length limit", () => {
    expect(appendSpoken("abc", "defgh", 6)).toBe("abc de");
    expect(appendSpoken("", "abcdefgh", 5)).toBe("abcde");
  });
  it("ignores empty speech", () => {
    expect(appendSpoken("keep", "   ", 100)).toBe("keep");
  });
});

describe("SPEECH_LANG", () => {
  it("maps both app languages", () => {
    expect(SPEECH_LANG.en).toBe("en-US");
    expect(SPEECH_LANG["zh-Hant"]).toBe("zh-TW");
  });
});
