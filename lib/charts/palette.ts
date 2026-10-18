// Chart colours for the History & Insights page, chosen per the dataviz skill's method
// (color assigned by job — identity / magnitude / polarity — never picked by eye).
//
// - Partner A vs B is a 2-series IDENTITY pair. It reuses the rose/espresso pairing already
//   shipped on the verdict's fault meter (Phase 6), so the same two colours mean "Partner A"
//   and "Partner B" everywhere in the app — that consistency matters more here than deriving
//   a fresh pair from the skill's generic default palette.
// - Issues / conflict patterns are nominal CATEGORICAL (identity, unordered): the
//   skill's validated default 8-hue set (`references/palette.md`), which clears the adjacent-
//   pair CVD and normal-vision checks for bar/line charts in this order. More than 8 series
//   folds into "Other" (muted) rather than cycling — cycling breaks the CVD guarantee.
// - The peace calendar's two day states are a 2-slot categorical pair, run through the skill's
//   validator: green #6aaf7d vs the app's stamp red #b8405e passes lightness, chroma, CVD
//   (deutan ΔE 13.8) and normal-vision checks. Their contrast on white is under 3:1, so every day
//   also has a text label (hover caption, aria-label) and the counts are written out.
export const PARTNER_COLOR = { a: "#f4c9d6", b: "#3e2723" } as const; // rose / espresso

// - The argument loop's stops are told apart by colour: five evenly spaced steps (OKLab) along
//   the theme gradient espresso-bevel-hi #63433c -> heart #d9728f -> soft rose #fbe3ea. All pairs
//   pass the validator's CVD check (protan ΔE 11.2); neighbours sit at normal-vision ΔE 13.8, just
//   under its 15 target (no lighter five-step theme gradient reaches 15), so colour is never the
//   only link: the list runs in the loop's order (clockwise from the top) and each row lights up
//   with its stop. Every dot carries a hairline ring so the palest shows on white. "How often"
//   uses a neutral bar meter, so it never shares these colours.
export const LOOP_COLORS = ["#63433c", "#9c5b64", "#d9728f", "#edabbb", "#fbe3ea"] as const;

export const DAY_COLOR = { peaceful: "#6aaf7d", conflict: "#b8405e" } as const;

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
