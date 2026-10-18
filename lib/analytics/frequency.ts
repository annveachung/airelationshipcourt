// How often a conflict pattern comes up: its share of the couple's closed cases, and a plain-
// language level for it. Thresholds are on the share, so they mean the same with 5 or 50 cases.
export type FrequencyLevel = "often" | "sometimes" | "rarely";

export const OFTEN_FROM = 40; // % of cases
export const SOMETIMES_FROM = 20;

export function frequencyOf(count: number, totalCases: number): { percent: number; level: FrequencyLevel } {
  const percent = totalCases > 0 ? Math.round((count / totalCases) * 100) : 0;
  const level = percent >= OFTEN_FROM ? "often" : percent >= SOMETIMES_FROM ? "sometimes" : "rarely";
  return { percent, level };
}
