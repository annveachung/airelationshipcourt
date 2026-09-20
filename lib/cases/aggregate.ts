// Pure and unit-tested: the final responsibility split is computed HERE, from the three
// panel scores, never by a model. That makes it reproducible, testable and explainable.

export const PANEL_ROLES = ["jury", "family_counsellor", "social_worker"] as const;
export type PanelRole = (typeof PANEL_ROLES)[number];

export type Scores = { a: number; b: number };
export type PanelScores = Record<PanelRole, Scores>;

// Equal weighting for now. Changing how much each role counts is a one-line change.
export const PANEL_WEIGHTS: Record<PanelRole, number> = {
  jury: 1,
  family_counsellor: 1,
  social_worker: 1,
};

export type Aggregate = {
  finalA: number;
  finalB: number;
  moreResponsible: "partner_a" | "partner_b";
  decidedBy: "percentage" | "jury" | "fallback";
};

const round1 = (n: number) => Math.round(n * 10) / 10;

export function aggregate(scores: PanelScores, weights = PANEL_WEIGHTS): Aggregate {
  const totalWeight = PANEL_ROLES.reduce((sum, r) => sum + weights[r], 0);
  const rawA = PANEL_ROLES.reduce((sum, r) => sum + weights[r] * scores[r].a, 0) / totalWeight;
  const rawB = PANEL_ROLES.reduce((sum, r) => sum + weights[r] * scores[r].b, 0) / totalWeight;

  // Normalise by the real total (a model may return 55/50), then force B = 100 - A so the
  // two always add up to exactly 100.
  const total = rawA + rawB;
  const finalA = total === 0 ? 50 : round1((rawA / total) * 100);
  const finalB = round1(100 - finalA);

  // Clear difference: the percentage decides who is more responsible.
  if (Math.abs(finalA - finalB) >= 1) {
    return {
      finalA,
      finalB,
      moreResponsible: finalA > finalB ? "partner_a" : "partner_b",
      decidedBy: "percentage",
    };
  }

  // Too close to call: the Jury's own split decides...
  const jury = scores.jury;
  if (jury.a !== jury.b) {
    return { finalA, finalB, moreResponsible: jury.a > jury.b ? "partner_a" : "partner_b", decidedBy: "jury" };
  }

  // ...and if the Jury is exactly level, the other two members' average does.
  const others: PanelRole[] = ["family_counsellor", "social_worker"];
  const otherA = others.reduce((s, r) => s + scores[r].a, 0);
  const otherB = others.reduce((s, r) => s + scores[r].b, 0);
  if (otherA !== otherB) {
    return { finalA, finalB, moreResponsible: otherA > otherB ? "partner_a" : "partner_b", decidedBy: "fallback" };
  }

  // A perfect tie everywhere still needs a winner (the product always names one).
  return { finalA, finalB, moreResponsible: "partner_a", decidedBy: "fallback" };
}
