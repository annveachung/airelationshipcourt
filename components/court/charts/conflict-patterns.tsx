import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/card";
import { categoricalColor } from "@/lib/charts/palette";
import type { PatternCount } from "@/lib/analytics/stats";

// Free-text patterns (not a fixed list, unlike issues) — the top few the court's analysis
// has spotted most often across the couple's closed cases.
export async function ConflictPatterns({ counts }: { counts: PatternCount[] }) {
  const t = await getTranslations("insights");
  if (counts.length === 0) return null;
  const max = Math.max(...counts.map((c) => c.count));

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h3 className="text-headline-sm text-espresso">{t("patternsHeading")}</h3>
        <p className="text-body-sm text-walnut">{t("patternsBody")}</p>
      </div>
      <ul className="flex flex-col gap-2" role="img" aria-label={t("patternsHeading")}>
        {counts.map((c, i) => (
          <li key={c.pattern} className="flex items-center gap-3">
            <span className="min-w-0 flex-1 truncate text-body-sm text-ink" title={c.pattern}>
              {c.pattern}
            </span>
            <span className="h-3 w-24 shrink-0 overflow-hidden rounded-full bg-recessed">
              <span
                className="block h-full rounded-full"
                style={{ width: `${(c.count / max) * 100}%`, background: categoricalColor(i) }}
              />
            </span>
            <span className="w-6 shrink-0 text-right text-body-sm text-walnut">{c.count}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
