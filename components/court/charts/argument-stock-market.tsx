import { ArrowDown, ArrowRight, ArrowUp } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/card";
import type { StockRow, WinningTally } from "@/lib/analytics/stock-market";
import { cn } from "@/lib/cn";

type Props = {
  rows: StockRow[];
  winning: WinningTally;
  names: { a: string; b: string };
};

const ArrowIcon = { up: ArrowUp, down: ArrowDown, flat: ArrowRight } as const;

// The humorous board: which issues are trending, and a light-hearted scoreboard. Values are
// derived shares of closed cases (see lib/analytics/stock-market.ts) — not financial data.
export async function ArgumentStockMarket({ rows, winning, names }: Props) {
  const t = await getTranslations("insights");
  const tIssues = await getTranslations("issues");
  if (rows.length === 0) return null;

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h3 className="text-headline-sm text-espresso">{t("stockMarketHeading")}</h3>
        <p className="text-body-sm text-walnut">{t("stockMarketBody")}</p>
      </div>

      <ul className="flex flex-col gap-2">
        {rows.map((row) => {
          const Arrow = row.arrow ? ArrowIcon[row.arrow] : null;
          return (
            <li key={row.issue} className="flex items-center justify-between gap-3 text-body-md">
              <span className="min-w-0 truncate text-ink">{tIssues(row.issue)}</span>
              <span className="flex shrink-0 items-center gap-2">
                <span className="text-walnut">{row.sharePct}%</span>
                {Arrow && row.changePct !== null ? (
                  <span
                    className={cn(
                      "flex items-center gap-0.5 text-body-sm font-medium",
                      row.arrow === "up" && "text-espresso",
                      row.arrow === "down" && "text-rose-deep",
                      row.arrow === "flat" && "text-walnut",
                    )}
                  >
                    <Arrow size={14} aria-hidden />
                    {row.changePct > 0 ? "+" : ""}
                    {row.changePct}
                  </span>
                ) : (
                  <span className="text-body-sm text-outline-soft">{t("notEnoughForChange")}</span>
                )}
              </span>
            </li>
          );
        })}
      </ul>

      <div className="border-t border-hairline pt-3">
        <h4 className="text-label-docket uppercase text-walnut">{t("scoreboardHeading")}</h4>
        <p className="text-body-md text-ink">
          {t("scoreboard", { a: names.a, aCount: winning.a, bCount: winning.b, b: names.b })}
          {t("scoreboardTie", { ties: winning.ties })}
        </p>
      </div>
    </Card>
  );
}
