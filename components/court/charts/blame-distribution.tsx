import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";
import { PARTNER_COLOR } from "@/lib/charts/palette";

type Props = {
  names: { a: string; b: string };
  avg: { a: number; b: number };
  moreResponsible: { a: number; b: number }; // cases where each partner was found more responsible
};

/** One 100% stacked bar: the couple's average split of responsibility, both ends labelled. */
export function BlameDistribution({ names, avg, moreResponsible }: Props) {
  const t = useTranslations("insights");
  const total = avg.a + avg.b || 1;
  const share = { a: (avg.a / total) * 100, b: (avg.b / total) * 100 };
  const label = { a: `${names.a} ${avg.a}%`, b: `${names.b} ${avg.b}%` };

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h3 className="text-headline-sm text-espresso">{t("blameHeading")}</h3>
        <p className="text-body-sm text-walnut">{t("blameBody")}</p>
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex justify-between gap-4">
          <div className="flex min-w-0 flex-col">
            <span className="text-headline-sm text-espresso">{avg.a}%</span>
            <span className="flex min-w-0 items-center gap-1.5 text-body-sm text-walnut">
              <span aria-hidden className="size-2.5 shrink-0 rounded-full shadow-[inset_0_0_0_1px_var(--color-hairline-strong)]" style={{ background: PARTNER_COLOR.a }} />
              <span className="truncate">{names.a}</span>
            </span>
          </div>
          <div className="flex min-w-0 flex-col items-end">
            <span className="text-headline-sm text-espresso">{avg.b}%</span>
            <span className="flex min-w-0 items-center gap-1.5 text-body-sm text-walnut">
              <span className="truncate">{names.b}</span>
              <span aria-hidden className="size-2.5 shrink-0 rounded-full" style={{ background: PARTNER_COLOR.b }} />
            </span>
          </div>
        </div>
        <div className="flex h-7 w-full gap-[2px]" role="img" aria-label={`${label.a}, ${label.b}`}>
          {share.a > 0 && (
            <div
              title={label.a}
              className="h-full rounded-l-[4px] shadow-[inset_0_0_0_1px_var(--color-hairline-strong)]"
              style={{ width: `${share.a}%`, background: PARTNER_COLOR.a }}
            />
          )}
          {share.b > 0 && (
            <div title={label.b} className="h-full rounded-r-[4px]" style={{ width: `${share.b}%`, background: PARTNER_COLOR.b }} />
          )}
        </div>
      </div>

      <p className="text-body-sm text-walnut">
        {t("moreResponsibleCounts", { a: names.a, aCount: moreResponsible.a, b: names.b, bCount: moreResponsible.b })}
      </p>
    </Card>
  );
}
