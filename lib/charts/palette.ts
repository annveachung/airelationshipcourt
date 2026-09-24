// Chart colours for the History & Insights page, chosen per the dataviz skill's method
// (color assigned by job — identity / magnitude / polarity — never picked by eye).
//
// - Partner A vs B is a 2-series IDENTITY pair. It reuses the rose/espresso pairing already
//   shipped on the verdict's fault meter (Phase 6), so the same two colours mean "Partner A"
//   and "Partner B" everywhere in the app — that consistency matters more here than deriving
//   a fresh pair from the skill's generic default palette.
// - Conflict intensity (Low..Severe) is ORDINAL: one hue, monotone light->dark, matching
//   `lib/cases/intensity.ts`'s four bands.
// - Issues / emotions / conflict patterns are nominal CATEGORICAL (identity, unordered): the
//   skill's validated default 8-hue set (`references/palette.md`), which clears the adjacent-
//   pair CVD and normal-vision checks for bar/line charts in this order. More than 8 series
//   folds into "Other" (muted) rather than cycling — cycling breaks the CVD guarantee.
export const PARTNER_COLOR = { a: "#f4c9d6", b: "#3e2723" } as const; // rose / espresso

export const INTENSITY_RAMP: Record<"low" | "moderate" | "high" | "severe", string> = {
  low: "#e7dcd3",
  moderate: "#c7a99c",
  high: "#8c6d62",
  severe: "#3e2723",
};

// Validated default categorical order (dataviz skill, references/palette.md), light mode.
export const CATEGORICAL = [
  "#2a78d6", // blue
  "#eb6834", // orange
  "#1baf7a", // aqua
  "#eda100", // yellow
  "#e87ba4", // magenta
  "#008300", // green
  "#4a3aa7", // violet
  "#e34948", // red
] as const;

export const OTHER_COLOR = "#8c6d62"; // walnut — the muted "Other" bucket, not part of identity

/** Assigns the fixed categorical order to a list of labels, folding anything past 8 into "Other". */
export function categoricalColor(index: number): string {
  return index < CATEGORICAL.length ? CATEGORICAL[index] : OTHER_COLOR;
}
