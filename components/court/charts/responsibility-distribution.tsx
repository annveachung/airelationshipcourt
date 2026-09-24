"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";
import { PARTNER_COLOR } from "@/lib/charts/palette";
import type { ResponsibilityPoint } from "@/lib/analytics/stats";

type Props = {
  points: ResponsibilityPoint[];
  names: { a: string; b: string };
  avg: { a: number; b: number };
};

// Each closed case's final A/B split, oldest first, plus the running average as a reference line.
export function ResponsibilityDistribution({ points, names, avg }: Props) {
  const t = useTranslations("insights");
  if (points.length === 0) return null;

  const data = [...points].reverse().map((p, i) => ({ index: i + 1, a: p.finalA, b: p.finalB }));

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h3 className="text-headline-sm text-espresso">{t("responsibilityHeading")}</h3>
        <p className="text-body-sm text-walnut">{t("responsibilityBody")}</p>
      </div>
      <div className="flex gap-4 text-body-sm text-walnut">
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="size-2.5 rounded-full" style={{ background: PARTNER_COLOR.a }} />
          {names.a}
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="size-2.5 rounded-full" style={{ background: PARTNER_COLOR.b }} />
          {names.b}
        </span>
      </div>
      <div className="h-64 w-full" role="img" aria-label={t("responsibilityHeading")}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-hairline)" vertical={false} />
            <XAxis dataKey="index" tick={{ fontSize: 12, fill: "var(--color-walnut)" }} tickLine={false} axisLine={false} />
            <YAxis
              domain={[0, 100]}
              tickFormatter={(v: number) => `${v}%`}
              tick={{ fontSize: 12, fill: "var(--color-walnut)" }}
              tickLine={false}
              axisLine={false}
              width={40}
            />
            <Tooltip
              formatter={(value, key) => [`${value}%`, key === "a" ? names.a : names.b]}
              labelFormatter={() => ""}
              contentStyle={{ background: "var(--color-surface)", border: "1px solid var(--color-hairline-strong)", borderRadius: 8 }}
            />
            <ReferenceLine y={avg.a} stroke={PARTNER_COLOR.a} strokeDasharray="4 4" />
            <Bar dataKey="a" stackId="split" fill={PARTNER_COLOR.a} radius={[4, 4, 0, 0]} />
            <Bar dataKey="b" stackId="split" fill={PARTNER_COLOR.b} radius={[0, 0, 4, 4]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="text-body-sm text-walnut">
        {t("average")}: {names.a} {avg.a}% · {names.b} {avg.b}%
      </p>
    </Card>
  );
}
