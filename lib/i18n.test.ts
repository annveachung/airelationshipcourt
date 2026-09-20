import { describe, expect, it } from "vitest";
import { isLocale, localeFromAcceptLanguage } from "./i18n";

describe("isLocale", () => {
  it("accepts supported locales only", () => {
    expect(isLocale("en")).toBe(true);
    expect(isLocale("zh-Hant")).toBe(true);
    expect(isLocale("zh-Hans")).toBe(false);
    expect(isLocale(undefined)).toBe(false);
  });
});

describe("localeFromAcceptLanguage", () => {
  it("defaults to English", () => {
    expect(localeFromAcceptLanguage(null)).toBe("en");
    expect(localeFromAcceptLanguage("fr-FR,fr;q=0.9")).toBe("en");
  });
  it("maps Traditional Chinese variants", () => {
    expect(localeFromAcceptLanguage("zh-TW,zh;q=0.9,en;q=0.8")).toBe("zh-Hant");
    expect(localeFromAcceptLanguage("zh-HK")).toBe("zh-Hant");
    expect(localeFromAcceptLanguage("zh-Hant-TW")).toBe("zh-Hant");
    expect(localeFromAcceptLanguage("zh")).toBe("zh-Hant");
  });
  it("does not offer Simplified Chinese", () => {
    expect(localeFromAcceptLanguage("zh-CN,zh;q=0.9")).toBe("en");
    expect(localeFromAcceptLanguage("zh-Hans")).toBe("en");
  });
  it("respects the order of preference", () => {
    expect(localeFromAcceptLanguage("en-US,zh-TW;q=0.5")).toBe("en");
    expect(localeFromAcceptLanguage("zh-TW,en;q=0.5")).toBe("zh-Hant");
  });
});
