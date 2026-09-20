import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/card";
import { optionLabel } from "@/lib/i18n-labels";

export type TestimonyView = {
  name: string;
  what_happened: string;
  frequency: string;
  causes: string[];
  cause_note: string | null;
  emotions: string[];
  severity: number;
  partner_did_wrong: string;
  needs: string[];
  needs_note: string | null;
};

// Both testimonies, revealed now that the verdict is out (the database only allows this from VERDICT).
export async function TestimoniesView({ testimonies }: { testimonies: TestimonyView[] }) {
  const t = await getTranslations("verdict");
  const tTestimony = await getTranslations("testimony");
  const tAll = await getTranslations();
  const list = (group: "emotions" | "causes" | "needs", values: string[]) =>
    values.map((v) => optionLabel(tAll, group, v)).join(", ");

  const field = (label: string, value: string) => (
    <div className="flex flex-col gap-0.5">
      <dt className="text-label-docket uppercase text-walnut">{label}</dt>
      <dd className="whitespace-pre-line break-words text-body-md text-ink">{value}</dd>
    </div>
  );

  return (
    <details className="group rounded-card border border-hairline bg-surface shadow-card">
      <summary className="cursor-pointer list-none px-4 py-3 text-headline-sm text-espresso focus-visible:outline-2 focus-visible:outline-espresso">
        {t("testimonies")}
      </summary>
      <div className="grid gap-4 border-t border-hairline p-4 md:grid-cols-2">
        {testimonies.map((x) => (
          <Card key={x.name} className="flex flex-col gap-3 shadow-none">
            <h3 className="text-headline-sm text-espresso">{t("testimonyOf", { name: x.name })}</h3>
            <dl className="flex flex-col gap-3">
              {field(tTestimony("whatHappened"), x.what_happened)}
              {field(tTestimony("frequencyLegend"), optionLabel(tAll, "frequency", x.frequency))}
              {field(tTestimony("causesLegend"), list("causes", x.causes))}
              {x.cause_note && field(t("causeNote"), x.cause_note)}
              {field(tTestimony("emotionsLegend"), list("emotions", x.emotions))}
              {field(t("severity"), String(x.severity))}
              {field(tTestimony("partnerWrong"), x.partner_did_wrong)}
              {field(tTestimony("needsLegend"), list("needs", x.needs))}
              {x.needs_note && field(t("needsNote"), x.needs_note)}
            </dl>
          </Card>
        ))}
      </div>
    </details>
  );
}
