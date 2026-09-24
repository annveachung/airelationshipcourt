import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/card";
import { categoricalColor } from "@/lib/charts/palette";
import { optionLabel } from "@/lib/i18n-labels";
import type { EmotionCount } from "@/lib/analytics/stats";

// Simple horizontal bars: the feelings partners have picked most often in testimony.
export async function EmotionCounts({ counts }: { counts: EmotionCount[] }) {
  const t = await getTranslations("insights");
  const tAll = await getTranslations();
  if (counts.length === 0) return null;
  const max = Math.max(...counts.map((c) => c.count));

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h3 className="text-headline-sm text-espresso">{t("emotionsHeading")}</h3>
        <p className="text-body-sm text-walnut">{t("emotionsBody")}</p>
      </div>
      <ul className="flex flex-col gap-2" role="img" aria-label={t("emotionsHeading")}>
        {counts.map((c, i) => (
          <li key={c.emotion} className="flex items-center gap-3">
            <span className="w-24 shrink-0 truncate text-body-sm text-ink">
              {optionLabel(tAll, "emotions", c.emotion)}
            </span>
            <span className="h-3 flex-1 overflow-hidden rounded-full bg-recessed">
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
