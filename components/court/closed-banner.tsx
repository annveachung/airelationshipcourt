import { ChevronDown } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { CaseStamp } from "@/components/court/case-stamp";
import { SignatureBlock } from "@/components/court/signature-block";
import { PixelTreaty } from "@/components/pixel-icons";
import { peaceLevel } from "@/lib/cases/treaty";
import type { Signature } from "@/lib/cases/verdict-data";

type Props = {
  closedReason: "treaty" | "adjourned" | null;
  signatures: Signature[];
  names: { a: string; b: string };
  signed: { a: boolean; b: boolean };
  // The court's own 2–3 sentence summary of the case (names already filled in), not what either
  // partner typed; null until the report exists.
  summary: string | null;
  closedOn: string | null;
};

// The end of a case, shown above the report: one compact bar (treaty signed, or adjourned) with a
// "Case closed" rubber stamp inked across it, expanding into the case summary, the signatures and
// the Peace-o-meter. Collapsed by default so the report starts right below it. Printing always
// shows it opened (globals.css).
export async function ClosedBanner({ closedReason, signatures, names, signed, summary, closedOn }: Props) {
  const t = await getTranslations("closed");
  const treatySigned = closedReason === "treaty";
  const peace = peaceLevel(signatures);
  const pct = peace.possible === 0 ? 0 : Math.round((peace.agreed / peace.possible) * 100);

  return (
    <details className="group border-2 border-espresso bg-surface shadow-card">
      <summary className="relative flex cursor-pointer list-none items-center gap-4 p-4 pb-12 sm:pb-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-espresso [&::-webkit-details-marker]:hidden">
        <PixelTreaty sealed={treatySigned} className="shrink-0" />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="sr-only">{t("stamp")}</span>
          <span className="text-headline-sm text-espresso">
            {treatySigned ? t("treatyTitle") : t("adjournedShort")}
          </span>
          {treatySigned && (
            <span className="truncate text-body-sm text-walnut">{t("signedBy", { a: names.a, b: names.b })}</span>
          )}
        </div>
        <span className="flex shrink-0 items-center gap-1 text-body-sm font-bold text-walnut print:hidden">
          <span className="hidden sm:inline">{t("details")}</span>
          <ChevronDown size={18} aria-hidden className="transition-transform group-open:rotate-180" />
        </span>
        {/* Inked onto the bar like a real stamp, kept inside its edges (no sideways scrolling) and
            clear of the arrow. Phones: smaller, in a strip of extra space at the bottom of the bar
            (pb-12), so it doesn't sit on top of the title or the "signed by" line. Wider: in the
            open space beside "Details". */}
        <CaseStamp
          label={t("stamp")}
          date={closedOn}
          className="absolute bottom-2 right-9 sm:bottom-auto sm:right-24 sm:top-1/2 sm:-translate-y-1/2"
        />
      </summary>

      <div className="flex flex-col gap-5 border-t-2 border-dashed border-espresso/25 p-4 md:p-6">
        {summary && (
          <div className="flex flex-col gap-1">
            <span className="text-label-docket uppercase text-walnut">{t("complaint")}</span>
            <p className="break-words text-body-md text-ink">{summary}</p>
          </div>
        )}

        {treatySigned ? (
          <>
            <div className="flex flex-col gap-2">
              <span className="text-label-docket uppercase text-walnut">{t("signatures")}</span>
              <div className="grid gap-4 sm:grid-cols-2">
                <SignatureBlock name={names.a} signed={signed.a} />
                <SignatureBlock name={names.b} signed={signed.b} />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-label-docket uppercase text-walnut">{t("peaceMeter")}</span>
                <span className="text-body-sm text-espresso">
                  {t("peaceLevel", { agreed: peace.agreed, possible: peace.possible })}
                </span>
              </div>
              <div
                role="progressbar"
                aria-valuenow={pct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={t("peaceMeter")}
                className="h-3 w-full overflow-hidden border-2 border-espresso bg-recessed"
              >
                <div className="h-full bg-heart" style={{ width: `${pct}%` }} />
              </div>
              <p className="text-body-md text-ink">{t(`band.${peace.band}`)}</p>
            </div>
          </>
        ) : (
          <p className="text-body-md text-walnut">{t("adjournedBody")}</p>
        )}
      </div>
    </details>
  );
}
