"use client";

import Link from "next/link";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";
import { PARTNER_COLOR } from "@/lib/charts/palette";

export type PastCaseRow = {
  id: string;
  href: string;
  title: string;
  month: string; // group heading, e.g. "October 2026"
  meta: string; // "Oct 6 · Communication"
  split: { a: number; b: number };
  splitLabel: string; // "Ann 42%, Bob 58%"
};

const VISIBLE = 5;

/** Closed cases, newest first, grouped by month in one card. Long lists start collapsed. */
export function PastCases({ rows }: { rows: PastCaseRow[] }) {
  const t = useTranslations("history");
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? rows : rows.slice(0, VISIBLE);

  const groups: { month: string; rows: PastCaseRow[] }[] = [];
  for (const row of shown) {
    const last = groups[groups.length - 1];
    if (last?.month === row.month) last.rows.push(row);
    else groups.push({ month: row.month, rows: [row] });
  }

  return (
    <Card className="flex flex-col gap-4">
      {groups.map((group) => (
        <div key={group.month} className="flex flex-col">
          <h3 className="pb-1 text-label-docket uppercase text-walnut">{group.month}</h3>
          <ul className="flex flex-col divide-y divide-hairline">
            {group.rows.map((row) => (
              <li key={row.id}>
                <Link
                  href={row.href}
                  className="-mx-2 flex items-center gap-3 rounded px-2 py-2.5 hover:bg-recessed/60 focus-visible:outline-2 focus-visible:outline-espresso"
                >
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-body-md font-medium text-espresso">{row.title}</span>
                    <span className="truncate text-body-sm text-walnut">{row.meta}</span>
                  </div>
                  <div
                    role="img"
                    aria-label={row.splitLabel}
                    title={row.splitLabel}
                    className="flex h-2 w-14 shrink-0 gap-px overflow-hidden rounded-full"
                  >
                    <span
                      className="h-full shadow-[inset_0_0_0_1px_var(--color-hairline-strong)]"
                      style={{ width: `${row.split.a}%`, background: PARTNER_COLOR.a }}
                    />
                    <span className="h-full" style={{ width: `${row.split.b}%`, background: PARTNER_COLOR.b }} />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}

      {rows.length > VISIBLE && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="self-start text-body-sm font-medium text-espresso underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-espresso"
        >
          {expanded ? t("showFewer") : t("showAll", { count: rows.length })}
        </button>
      )}
    </Card>
  );
}
