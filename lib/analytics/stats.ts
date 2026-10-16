// SERVER. Reads go through the caller's normal (Row Level Security) client, same reasoning as
// history.ts. All aggregation happens here in TypeScript, over plain selects — a couple's case
// count is small enough that this needs no SQL views or functions.
import { normalizeIssue, type IssueCategory } from "@/lib/cases/taxonomy";
import type { createClient } from "@/lib/db/server";
import type { HistoryCase } from "./history";

type Db = Awaited<ReturnType<typeof createClient>>;

export type IssueCount = { issue: IssueCategory; count: number };
export type PatternCount = { pattern: string; count: number; cases: { id: string; title: string }[] };

export type CoupleStats = {
  casesCompleted: number;
  topIssues: IssueCount[]; // top 2
  avgResponsibility: { a: number; b: number };
  conflictPatternCounts: PatternCount[];
  results: ("partner_a" | "partner_b" | "tie")[]; // one per closed case, for the scoreboard
};

const MAX_PATTERNS = 24;
const round1 = (n: number) => Math.round(n * 10) / 10;

const EMPTY: CoupleStats = {
  casesCompleted: 0,
  topIssues: [],
  avgResponsibility: { a: 0, b: 0 },
  conflictPatternCounts: [],
  results: [],
};

function topN<T extends string>(counts: Map<T, number>, n: number): { key: T; count: number }[] {
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([key, count]) => ({ key, count }));
}

export async function getCoupleStats(db: Db, coupleId: string, cases: HistoryCase[]): Promise<CoupleStats> {
  if (cases.length === 0) return EMPTY;
  const caseIds = cases.map((c) => c.id);

  const { data: analyses } = await db.from("case_analyses").select("case_id, primary_issue, secondary_issue, conflict_patterns").in("case_id", caseIds);

  // Issues (primary + secondary) and conflict patterns, with the cases each pattern came up in.
  const issueCounts = new Map<IssueCategory, number>();
  const titles = new Map(cases.map((c) => [c.id, c.title]));
  const patternCases = new Map<string, { id: string; title: string }[]>();
  for (const row of analyses ?? []) {
    const issues = new Set<IssueCategory>([
      normalizeIssue(row.primary_issue),
      normalizeIssue(row.secondary_issue),
    ]);
    for (const issue of issues) issueCounts.set(issue, (issueCounts.get(issue) ?? 0) + 1);
    for (const pattern of (row.conflict_patterns as unknown[] | null) ?? []) {
      if (typeof pattern !== "string" || !pattern.trim()) continue;
      const key = pattern.trim().toLowerCase();
      const seen = patternCases.get(key) ?? [];
      if (!seen.some((c) => c.id === row.case_id)) seen.push({ id: row.case_id, title: titles.get(row.case_id) ?? "" });
      patternCases.set(key, seen);
    }
  }

  const avgResponsibility = {
    a: round1(cases.reduce((s, c) => s + c.finalA, 0) / cases.length),
    b: round1(cases.reduce((s, c) => s + c.finalB, 0) / cases.length),
  };

  const results = cases.map((c): "partner_a" | "partner_b" | "tie" =>
    c.finalA === c.finalB ? "tie" : c.moreResponsible,
  );

  return {
    casesCompleted: cases.length,
    topIssues: topN(issueCounts, 2).map(({ key, count }) => ({ issue: key, count })),
    avgResponsibility,
    conflictPatternCounts: [...patternCases.entries()]
      .map(([pattern, list]) => ({ pattern, count: list.length, cases: list }))
      .sort((a, b) => b.count - a.count || a.pattern.localeCompare(b.pattern))
      .slice(0, MAX_PATTERNS),
    results,
  };
}
