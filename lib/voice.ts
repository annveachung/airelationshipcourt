// Pure and unit-tested helpers for voice-to-text input.
import type { Locale } from "./i18n";

// Which language the browser's speech recognition should listen for.
export const SPEECH_LANG: Record<Locale, string> = {
  en: "en-US",
  "zh-Hant": "zh-TW",
};

const CJK = /[　-鿿＀-￯]/;

/**
 * Adds spoken text to what's already in a field: a space between English words, none
 * between Chinese characters, and never past the field's length limit.
 */
export function appendSpoken(previous: string, spoken: string, max: number): string {
  const add = spoken.trim();
  if (!add) return previous;
  if (!previous) return add.slice(0, max);

  const joiner = CJK.test(previous.slice(-1)) || CJK.test(add[0]) ? "" : " ";
  return `${previous.replace(/\s+$/, "")}${joiner}${add}`.slice(0, max);
}
