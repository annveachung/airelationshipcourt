// Pure helpers (no server-only): safe for client code and unit tests.

export const LOCALES = ["en", "zh-Hant"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "NEXT_LOCALE";

// Shown in the language menu, always in the language's own script.
export const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  "zh-Hant": "繁體中文",
};

// How each language is named in AI prompts.
export const AI_LANGUAGE_NAMES: Record<Locale, string> = {
  en: "English",
  "zh-Hant": "Traditional Chinese (Taiwan usage)",
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

/**
 * Picks a supported locale from an Accept-Language header. Only Traditional Chinese
 * variants (and a bare "zh") map to zh-Hant; Simplified (zh-CN / zh-Hans) falls back
 * to English since Simplified isn't offered.
 */
export function localeFromAcceptLanguage(header: string | null | undefined): Locale {
  if (!header) return DEFAULT_LOCALE;
  const tags = header
    .split(",")
    .map((part) => part.split(";")[0].trim().toLowerCase())
    .filter(Boolean);

  for (const tag of tags) {
    if (tag.startsWith("en")) return "en";
    if (tag === "zh" || tag.includes("hant") || /^zh-(tw|hk|mo)$/.test(tag)) return "zh-Hant";
    if (tag.startsWith("zh")) return "en"; // zh-CN / zh-Hans: not offered
  }
  return DEFAULT_LOCALE;
}
