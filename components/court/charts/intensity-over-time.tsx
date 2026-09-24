"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";
import { INTENSITY_RAMP } from "@/lib/charts/palette";
import { INTENSITY_LEVEL } from "@/lib/cases/intensity";
import type { IntensityPoint } from "@/lib/analytics/stats";

// Each closed case's intensity band over time, oldest first, as an ordinal step line.
export function IntensityOverTime({ points }: { points: IntensityPoint[] }) {
  const t = useTranslations("insights");
  const tBands = useTranslations("courtStatus.bands");
  if (points.length === 0) return null;

  const sorted = [...points].sort((a, b) => new Date(a.closedAt).getTime() - new Date(b.closedAt).getTime());
  const data = sorted.map((p, i) => ({ index: i + 1, level: INTENSITY_LEVEL[p.band], band: p.band }));

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h3 className="text-headline-sm text-espresso">{t("intensityHeading")}</h3>
        <p className="text-body-sm text-walnut">{t("intensityBody")}</p>
      </div>
      <div className="h-56 w-full" role="img" aria-label={t("intensityHeading")}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-hairline)" vertical={false} />
            <XAxis dataKey="index" tick={{ fontSize: 12, fill: "var(--color-walnut)" }} tickLine={false} axisLine={false} />
            <YAxis
              domain={[1, 4]}
              ticks={[1, 2, 3, 4]}
              tickFormatter={(v: number) => tBands((["low", "moderate", "high", "severe"] as const)[v - 1])}
              tick={{ fontSize: 12, fill: "var(--color-walnut)" }}
              tickLine={false}
              axisLine={false}
              width={72}
            />
            <Tooltip
              formatter={(_value, _key, item) => [
                tBands((item.payload as { band?: keyof typeof INTENSITY_RAMP })?.band ?? "low"),
                t("intensityHeading"),
              ]}
              labelFormatter={() => ""}
              contentStyle={{ background: "var(--color-surface)", border: "1px solid var(--color-hairline-strong)", borderRadius: 8 }}
            />
            <Line
              type="monotone"
              dataKey="level"
              stroke={INTENSITY_RAMP.severe}
              strokeWidth={2}
              dot={{ r: 4, fill: INTENSITY_RAMP.severe }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
