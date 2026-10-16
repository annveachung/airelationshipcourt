// SERVER. Reads go through the caller's normal (Row Level Security) client, same reasoning as
// history.ts. All aggregation happens here in TypeScript, over plain selects — a couple's case
// count is small enough that this needs no SQL views or functions.
import { normalizeIssue, type IssueCategory } from "@/lib/cases/taxonomy";
import type { PeriodBucket } from "@/lib/analytics/stock-market";
import type { createClient } from "@/lib/db/server";
import type { HistoryCase } from "./history";

type Db = Awaited<ReturnType<typeof createClient>>;

export type IssueCount = { issue: IssueCategory; count: number };
export type PatternCount = { pattern: string; count: number };

export type CoupleStats = {
  casesCompleted: number;
  topIssues: IssueCount[]; // top 2
  avgResponsibility: { a: number; b: number };
  conflictPatternCounts: PatternCount[];
  issueSharePerPeriod: { current: PeriodBucket[]; previous: PeriodBucket[] };
  results: ("partner_a" | "partner_b" | "tie")[]; // one per closed case, for the scoreboard
};

const round1 = (n: number) => Math.round(n * 10) / 10;

const EMPTY: CoupleStats = {
  casesCompleted: 0,
  topIssues: [],
  avgResponsibility: { a: 0, b: 0 },
  conflictPatternCounts: [],
  issueSharePerPeriod: { current: [], previous: [] },
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

  // Issues (primary + secondary) and conflict patterns.
  const issueCounts = new Map<IssueCategory, number>();
  const issuesByCase = new Map<string, Set<IssueCategory>>(); // for the stock market's per-case buckets
  const patternCounts = new Map<string, number>();
  for (const row of analyses ?? []) {
    const issues = new Set<IssueCategory>([
      normalizeIssue(row.primary_issue),
      normalizeIssue(row.secondary_issue),
    ]);
    issuesByCase.set(row.case_id, issues);
    for (const issue of issues) issueCounts.set(issue, (issueCounts.get(issue) ?? 0) + 1);
    for (const pattern of (row.conflict_patterns as unknown[] | null) ?? []) {
      if (typeof pattern === "string" && pattern.trim()) {
        patternCounts.set(pattern, (patternCounts.get(pattern) ?? 0) + 1);
      }
    }
  }

  const avgResponsibility = {
    a: round1(cases.reduce((s, c) => s + c.finalA, 0) / cases.length),
    b: round1(cases.reduce((s, c) => s + c.finalB, 0) / cases.length),
  };

  const results = cases.map((c): "partner_a" | "partner_b" | "tie" =>
    c.finalA === c.finalB ? "tie" : c.moreResponsible,
  );

  // Two explainable windows (not calendar months — case volume is too low for that to be legible).
  const now = Date.now();
  const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;
  const inWindow = (closedAt: string, from: number, to: number) => {
    const t = new Date(closedAt).getTime();
    return t > from && t <= to;
  };
  const currentCases = cases.filter((c) => inWindow(c.closedAt, now - THIRTY_DAYS, now));
  const previousCases = cases.filter((c) => inWindow(c.closedAt, now - 2 * THIRTY_DAYS, now - THIRTY_DAYS));
  const bucketFor = (period: HistoryCase[]): PeriodBucket[] => {
    const counts = new Map<IssueCategory, number>();
    for (const c of period) {
      for (const issue of issuesByCase.get(c.id) ?? []) counts.set(issue, (counts.get(issue) ?? 0) + 1);
    }
    return [...counts.entries()].map(([issue, count]) => ({ issue, count, totalCases: period.length }));
  };

  return {
    casesCompleted: cases.length,
    topIssues: topN(issueCounts, 2).map(({ key, count }) => ({ issue: key, count })),
    avgResponsibility,
    conflictPatternCounts: topN(patternCounts, 6).map(({ key, count }) => ({ pattern: key, count })),
    issueSharePerPeriod: { current: bucketFor(currentCases), previous: bucketFor(previousCases) },
    results,
  };
}
