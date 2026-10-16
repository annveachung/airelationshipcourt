"use client";

import Link from "next/link";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";
import type { PatternCount } from "@/lib/analytics/stats";

const ONCE_VISIBLE = 4;

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// One dot per case the pattern came up in; each dot opens that case.
function Tally({ pattern }: { pattern: PatternCount }) {
  return (
    <span className="flex shrink-0 flex-wrap justify-end gap-1">
      {pattern.cases.map((c) => (
        <Link
          key={c.id}
          href={`/cases/${c.id}/report`}
          title={c.title}
          aria-label={c.title}
          className="size-3 rounded-full bg-stamp hover:bg-espresso focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-espresso"
        />
      ))}
    </span>
  );
}

/** Conflict patterns as a tally: the ones that keep coming back first, one dot per case. */
export function PatternTally({ patterns }: { patterns: PatternCount[] }) {
  const t = useTranslations("insights");
  const [showAllOnce, setShowAllOnce] = useState(false);
  if (patterns.length === 0) return null;

  const recurring = patterns.filter((p) => p.count >= 2);
  const once = patterns.filter((p) => p.count < 2);
  const onceShown = showAllOnce ? once : once.slice(0, ONCE_VISIBLE);

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h3 className="text-headline-sm text-espresso">{t("patternsHeading")}</h3>
        <p className="text-body-sm text-walnut">{t("patternsBody")}</p>
      </div>

      <section className="flex flex-col gap-1">
        <h4 className="text-label-docket uppercase text-walnut">{t("patternsRecurringHeading")}</h4>
        {recurring.length === 0 ? (
          <p className="text-body-md text-espresso">{t("patternsNoneRecurring")}</p>
        ) : (
          <ul className="flex flex-col divide-y divide-hairline">
            {recurring.map((p) => (
              <li
                key={p.pattern}
                className="flex items-center justify-between gap-4 py-2.5"
                aria-label={`${capitalize(p.pattern)}: ${t("patternCases", { count: p.count })}`}
              >
                <span className="min-w-0 text-body-md font-medium text-espresso">{capitalize(p.pattern)}</span>
                <span className="flex shrink-0 items-center gap-2">
                  <Tally pattern={p} />
                  <span className="w-5 text-right text-body-sm tabular-nums text-walnut">×{p.count}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {once.length > 0 && (
        <section className="flex flex-col gap-1">
          <h4 className="text-label-docket uppercase text-walnut">
            {t("patternsOnceHeading")} · {once.length}
          </h4>
          <ul className="flex flex-col divide-y divide-hairline">
            {onceShown.map((p) => (
              <li key={p.pattern} className="flex items-center justify-between gap-4 py-2">
                <span className="min-w-0 text-body-sm text-ink">{capitalize(p.pattern)}</span>
                <Tally pattern={p} />
              </li>
            ))}
          </ul>
          {once.length > ONCE_VISIBLE && (
            <button
              type="button"
              onClick={() => setShowAllOnce((v) => !v)}
              className="self-start pt-1 text-body-sm font-medium text-espresso underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-espresso"
            >
              {showAllOnce ? t("patternsShowFewer") : t("patternsShowMore", { count: once.length - ONCE_VISIBLE })}
            </button>
          )}
        </section>
      )}

      <p className="flex items-center gap-1.5 text-body-sm text-walnut">
        <span aria-hidden className="size-3 rounded-full bg-stamp" />
        {t("patternsLegendDot")}
      </p>
    </Card>
  );
}
