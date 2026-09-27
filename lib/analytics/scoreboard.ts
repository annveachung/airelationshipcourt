// The Home page's light-hearted scoreboard. Pure functions so the rules are easy to test.

export type Side = "partner_a" | "partner_b";
export type CaseWinner = Side | "tie";
export type PlayerScore = { gems: number; streak: number };

/** A case is "won" by the partner the court found LESS responsible; an even split is a tie. */
export function caseWinner({ finalA, finalB }: { finalA: number; finalB: number }): CaseWinner {
  if (finalA === finalB) return "tie";
  return finalA < finalB ? "partner_a" : "partner_b";
}

/**
 * One gem per case won, and a streak of wins in a row counting back from the most recent case.
 * `winners` must be newest first (the order getCoupleHistory returns). A tie earns nobody a gem
 * and ends both streaks.
 */
export function scoreboard(winners: CaseWinner[]): Record<Side, PlayerScore> {
  const score = (side: Side): PlayerScore => {
    const gems = winners.filter((w) => w === side).length;
    const firstMiss = winners.findIndex((w) => w !== side);
    const streak = firstMiss === -1 ? winners.length : firstMiss;
    return { gems, streak };
  };
  return { partner_a: score("partner_a"), partner_b: score("partner_b") };
}
