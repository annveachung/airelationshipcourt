// Pure and unit-tested. The "Argument Stock Market": a joke on top of real numbers. Values are
// derived shares of closed cases, not financial data — the humour lives in the copy only.
import type { IssueCategory } from "@/lib/cases/taxonomy";

export type PeriodBucket = { issue: IssueCategory; count: number; totalCases: number };

export type StockRow = {
  issue: IssueCategory;
  sharePct: number; // this period's share, 0-100
  changePct: number | null; // percentage-point change vs the previous period; null = not shown
  arrow: "up" | "down" | "flat" | null;
};

// Below this many cases in a period, a single case would swing the percentage wildly, so the
// change and its arrow are hidden rather than shown as a misleadingly precise number.
const MIN_CASES_FOR_CHANGE = 3;

function share(bucket: PeriodBucket): number {
  return bucket.totalCases === 0 ? 0 : Math.round((bucket.count / bucket.totalCases) * 1000) / 10;
}

/** One row per issue that appears in either period, sorted by current share, highest first. */
export function stockMarket(current: PeriodBucket[], previous: PeriodBucket[]): StockRow[] {
  const prevByIssue = new Map(previous.map((b) => [b.issue, b]));
  const enoughData = current[0]?.totalCases >= MIN_CASES_FOR_CHANGE && previous[0]?.totalCases >= MIN_CASES_FOR_CHANGE;

  return current
    .map((bucket) => {
      const sharePct = share(bucket);
      const prev = prevByIssue.get(bucket.issue);
      if (!enoughData || !prev) {
        return { issue: bucket.issue, sharePct, changePct: null, arrow: null };
      }
      const changePct = Math.round((sharePct - share(prev)) * 10) / 10;
      const arrow: StockRow["arrow"] = changePct > 0.5 ? "up" : changePct < -0.5 ? "down" : "flat";
      return { issue: bucket.issue, sharePct, changePct, arrow };
    })
    .sort((a, b) => b.sharePct - a.sharePct);
}

export type WinningTally = { a: number; b: number; ties: number };

/** A light-hearted scoreboard of who was found more responsible, across closed cases. */
export function whosWinning(results: ("partner_a" | "partner_b" | "tie")[]): WinningTally {
  return results.reduce<WinningTally>(
    (tally, r) => ({
      a: tally.a + (r === "partner_a" ? 1 : 0),
      b: tally.b + (r === "partner_b" ? 1 : 0),
      ties: tally.ties + (r === "tie" ? 1 : 0),
    }),
    { a: 0, b: 0, ties: 0 },
  );
}
