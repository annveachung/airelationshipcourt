// Pure and unit-tested: how much the three panel members agreed on who is more responsible.
// Computed in code (never by a model) and shown with a translated sentence.

import { PANEL_ROLES, type PanelScores } from "./aggregate";

export type PanelAgreement = "unanimous_a" | "unanimous_b" | "split_a" | "split_b" | "level";

export function panelAgreement(scores: PanelScores): PanelAgreement {
  let a = 0;
  let b = 0;
  for (const role of PANEL_ROLES) {
    if (scores[role].a > scores[role].b) a++;
    else if (scores[role].b > scores[role].a) b++;
    // an exactly level member abstains
  }
  if (a === PANEL_ROLES.length) return "unanimous_a";
  if (b === PANEL_ROLES.length) return "unanimous_b";
  if (a > b) return "split_a";
  if (b > a) return "split_b";
  return "level";
}
