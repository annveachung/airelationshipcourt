import type { useTranslations } from "next-intl";

// Option values (feelings, causes, needs...) are stored in the database in English.
// Only their LABELS are translated. Falls back to the stored value if a label is missing.
type Group = "emotions" | "causes" | "needs" | "frequency" | "trueFalse";

export function optionLabel(t: ReturnType<typeof useTranslations>, group: Group, value: string): string {
  const key = `${group}.${value}`;
  // Dynamic key: cast because the exact value isn't known at compile time.
  const has = (t as unknown as { has: (k: string) => boolean }).has(key);
  return has ? (t as unknown as (k: string) => string)(key) : value;
}
