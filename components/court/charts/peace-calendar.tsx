"use client";

import Link from "next/link";
import { useMemo, useState, useSyncExternalStore } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";
import { DAY_COLOR, DAY_OPACITY } from "@/lib/charts/palette";

export type ConflictDay = { filedAt: string; title: string; href: string };

type Props = {
  conflicts: ConflictDay[];
  courtOpenedAt: string; // the couple's start: days before it are neither peaceful nor conflict
};

const WEEKS = 26;
const DAY_MS = 24 * 60 * 60 * 1000;

type Day = {
  key: string;
  date: Date;
  state: "peaceful" | "conflict" | "before" | "future";
  cases: ConflictDay[];
};

// Local calendar day, so a case filed at 8am in Taipei lands on that day, not the UTC one.
const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

// Days are only known in the browser's timezone, so the grid renders after hydration.
const subscribe = () => () => {};
const useIsClient = () =>
  useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );

/** The last six months as a week-by-day grid: green peaceful days, pink days a case was filed. */
export function PeaceCalendar({ conflicts, courtOpenedAt }: Props) {
  const t = useTranslations("insights");
  const locale = useLocale();
  const isClient = useIsClient();
  const [active, setActive] = useState<Day | null>(null);

  const view = useMemo(() => {
    if (!isClient) return null;
    const today = startOfDay(new Date());
    // Test or imported cases can predate the couple record; the court "opened" at whichever is first.
    const opened = conflicts.reduce(
      (first, c) => {
        const d = startOfDay(new Date(c.filedAt));
        return d < first ? d : first;
      },
      startOfDay(new Date(courtOpenedAt)),
    );

    const byDay = new Map<string, ConflictDay[]>();
    for (const c of conflicts) {
      const key = dayKey(new Date(c.filedAt));
      byDay.set(key, [...(byDay.get(key) ?? []), c]);
    }

    // Columns are weeks starting Monday; the last column is the current week.
    const mondayOffset = (today.getDay() + 6) % 7;
    const firstDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() - mondayOffset - (WEEKS - 1) * 7);

    const days: Day[] = [];
    for (let i = 0; i < WEEKS * 7; i++) {
      const date = new Date(firstDay.getFullYear(), firstDay.getMonth(), firstDay.getDate() + i);
      const key = dayKey(date);
      const cases = byDay.get(key) ?? [];
      const state = date > today ? "future" : cases.length ? "conflict" : date < opened ? "before" : "peaceful";
      days.push({ key, date, state, cases });
    }

    // A month label sits over the first week that starts in that month, if there's room for it.
    const monthFormat = new Intl.DateTimeFormat(locale, { month: "short" });
    const months: { column: number; label: string }[] = [];
    for (let week = 0; week < WEEKS; week++) {
      const monday = days[week * 7].date;
      const prev = week === 0 ? null : days[(week - 1) * 7].date;
      if (prev && prev.getMonth() === monday.getMonth()) continue;
      if (months.length && week - months[months.length - 1].column < 3) continue;
      months.push({ column: week, label: monthFormat.format(monday) });
    }

    const peaceful = days.filter((d) => d.state === "peaceful").length;
    const conflict = days.filter((d) => d.state === "conflict").length;
    const lastConflict = conflicts.reduce<Date | null>((latest, c) => {
      const d = startOfDay(new Date(c.filedAt));
      return !latest || d > latest ? d : latest;
    }, null);
    const since = Math.max(0, Math.round((today.getTime() - (lastConflict ?? opened).getTime()) / DAY_MS));
    const anyBefore = days.some((d) => d.state === "before");

    return { days, months, peaceful, conflict, since, anyBefore };
  }, [isClient, conflicts, courtOpenedAt, locale]);

  const dateFormat = new Intl.DateTimeFormat(locale, { weekday: "short", month: "short", day: "numeric" });
  const describe = (day: Day) => {
    const date = dateFormat.format(day.date);
    if (day.state === "conflict") return t("dayConflict", { date, titles: day.cases.map((c) => c.title).join(", ") });
    if (day.state === "before") return t("dayBeforeCourt", { date });
    return t("dayPeaceful", { date });
  };

  const cellClass = "aspect-square w-full rounded-[2px]";

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h3 className="text-headline-sm text-espresso">{t("calendarHeading")}</h3>
        <p className="text-body-sm text-walnut">{t("calendarBody")}</p>
      </div>

      {view && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-body-sm text-espresso">
          <span>{t("calendarCounts", { peaceful: view.peaceful, conflict: view.conflict })}</span>
          <span>{t("daysSinceConflict", { days: view.since })}</span>
        </div>
      )}

      <div className="flex w-full max-w-[480px] flex-col gap-1">
        <div className="grid h-4 text-[11px] leading-4 text-walnut" style={{ gridTemplateColumns: `repeat(${WEEKS}, minmax(0, 1fr))` }}>
          {view?.months.map((m) => (
            <span key={m.column} className="whitespace-nowrap" style={{ gridColumnStart: m.column + 1 }}>
              {m.label}
            </span>
          ))}
        </div>
        <div
          className="grid grid-flow-col gap-[2px]"
          style={{ gridTemplateColumns: `repeat(${WEEKS}, minmax(0, 1fr))`, gridTemplateRows: "repeat(7, auto)" }}
          onMouseLeave={() => setActive(null)}
        >
          {view
            ? view.days.map((day) => {
                if (day.state === "future") return <span key={day.key} className={cellClass} />;
                const label = describe(day);
                const handlers = {
                  onMouseEnter: () => setActive(day),
                  onFocus: () => setActive(day),
                  onBlur: () => setActive(null),
                };
                if (day.state === "conflict") {
                  return (
                    <Link
                      key={day.key}
                      href={day.cases[0].href}
                      aria-label={label}
                      title={label}
                      className={`${cellClass} focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-espresso`}
                      style={{ background: DAY_COLOR.conflict, opacity: DAY_OPACITY }}
                      {...handlers}
                    />
                  );
                }
                return (
                  <span
                    key={day.key}
                    role="img"
                    aria-label={label}
                    title={label}
                    className={cellClass}
                    style={
                      day.state === "peaceful"
                        ? { background: DAY_COLOR.peaceful, opacity: DAY_OPACITY }
                        : { boxShadow: "inset 0 0 0 1px var(--color-hairline-strong)" }
                    }
                    onClick={() => setActive(day)}
                    {...handlers}
                  />
                );
              })
            : // Server render and first paint: an empty grid of the same size, so nothing jumps.
              Array.from({ length: WEEKS * 7 }, (_, i) => (
                <span key={i} className={`${cellClass} bg-recessed`} />
              ))}
        </div>
      </div>

      <p className="min-h-5 text-body-sm text-espresso" aria-live="polite">
        {active ? describe(active) : <span className="text-walnut">{t("calendarHint")}</span>}
      </p>

      <div className="flex flex-wrap gap-4 text-body-sm text-walnut">
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="size-2.5 rounded-[2px]" style={{ background: DAY_COLOR.peaceful, opacity: DAY_OPACITY }} />
          {t("peaceful")}
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="size-2.5 rounded-[2px]" style={{ background: DAY_COLOR.conflict, opacity: DAY_OPACITY }} />
          {t("conflict")}
        </span>
        {view?.anyBefore && (
          <span className="flex items-center gap-1.5">
            <span aria-hidden className="size-2.5 rounded-[2px] shadow-[inset_0_0_0_1px_var(--color-hairline-strong)]" />
            {t("beforeCourt")}
          </span>
        )}
      </div>
    </Card>
  );
}
