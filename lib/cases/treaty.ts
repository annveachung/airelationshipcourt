// Pure and unit-tested: the Peace Treaty's clauses and how "peaceful" a signed treaty is.

export const REQUIRED_CLAUSE = "accept_verdict" as const;
export const FIXED_CLAUSES = ["hug", "snacks", "old_grudges"] as const;
export const PERSONAL_CLAUSES = ["personal_1", "personal_2", "personal_3"] as const;

export const OPTIONAL_CLAUSES = [...FIXED_CLAUSES, ...PERSONAL_CLAUSES] as const;
export const ALL_CLAUSES = [REQUIRED_CLAUSE, ...OPTIONAL_CLAUSES] as const;

export type ClauseId = (typeof ALL_CLAUSES)[number];
export type OptionalClauseId = (typeof OPTIONAL_CLAUSES)[number];

export function isClauseId(value: unknown): value is ClauseId {
  return typeof value === "string" && (ALL_CLAUSES as readonly string[]).includes(value);
}

/**
 * Cleans the ticked clauses from a form: keeps only known ids, removes duplicates, and always
 * includes the required clause (signing means accepting the ruling).
 */
export function normalizeClauses(input: unknown[]): ClauseId[] {
  const ticked = new Set<ClauseId>(input.filter(isClauseId));
  ticked.add(REQUIRED_CLAUSE);
  return ALL_CLAUSES.filter((id) => ticked.has(id));
}

export type PeaceBand = "frosty" | "thawing" | "warm" | "lovebirds";

/** How many optional clauses were agreed across the signers, out of how many were possible. */
export function peaceLevel(signatures: { clauses: string[] }[]): { agreed: number; possible: number; band: PeaceBand } {
  const optional = new Set<string>(OPTIONAL_CLAUSES);
  const agreed = signatures.reduce((sum, s) => sum + s.clauses.filter((c) => optional.has(c)).length, 0);
  const possible = signatures.length * OPTIONAL_CLAUSES.length;
  const ratio = possible === 0 ? 0 : agreed / possible;
  const band: PeaceBand = ratio >= 0.8 ? "lovebirds" : ratio >= 0.5 ? "warm" : ratio >= 0.25 ? "thawing" : "frosty";
  return { agreed, possible, band };
}
