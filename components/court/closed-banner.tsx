import { getTranslations } from "next-intl/server";
import { CourtSeal } from "@/components/court/court-seal";
import { SignatureBlock } from "@/components/court/signature-block";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { peaceLevel } from "@/lib/cases/treaty";
import type { Signature } from "@/lib/cases/verdict-data";

type Props = {
  closedReason: "treaty" | "adjourned" | null;
  signatures: Signature[];
  names: { a: string; b: string };
  signed: { a: boolean; b: boolean };
};

// The end of a case: a stamped "CASE CLOSED", the Peace-o-meter for a signed treaty, or a
// gentle "adjourned" note.
export async function ClosedBanner({ closedReason, signatures, names, signed }: Props) {
  const t = await getTranslations("closed");
  const treatySigned = closedReason === "treaty";
  const peace = peaceLevel(signatures);
  const pct = peace.possible === 0 ? 0 : Math.round((peace.agreed / peace.possible) * 100);

  return (
    <Card variant="verdict" className="flex flex-col items-center gap-5 py-8 text-center">
      <CourtSeal className="size-20" />

      <span className="-rotate-3 border-4 border-double border-rose-deep px-5 py-1 text-headline-md uppercase tracking-widest text-rose-deep">
        {t("stamp")}
      </span>

      {treatySigned ? (
        <>
          <div className="flex flex-col gap-1">
            <h2 className="text-headline-lg text-espresso">{t("treatyTitle")}</h2>
            <p className="text-body-md text-walnut">{t("signedBy", { a: names.a, b: names.b })}</p>
          </div>

          <div className="flex w-full max-w-md flex-col gap-2 text-left">
            <span className="text-center text-label-docket uppercase text-walnut">{t("signatures")}</span>
            <div className="grid gap-4 sm:grid-cols-2">
              <SignatureBlock name={names.a} signed={signed.a} />
              <SignatureBlock name={names.b} signed={signed.b} />
            </div>
          </div>

          <div className="flex w-full max-w-sm flex-col gap-2">
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
              className="h-3 w-full overflow-hidden rounded-full bg-recessed"
            >
              <div className="h-full rounded-full bg-gradient-to-r from-rose to-espresso" style={{ width: `${pct}%` }} />
            </div>
            <p className="text-body-md text-ink">{t(`band.${peace.band}`)}</p>
          </div>
        </>
      ) : (
        <div className="flex flex-col gap-1">
          <h2 className="text-headline-lg text-espresso">{t("adjournedTitle")}</h2>
          <p className="max-w-sm text-body-md text-walnut">{t("adjournedBody")}</p>
        </div>
      )}

      <Button href="/cases/new" className="print:hidden">
        {t("fileNew")}
      </Button>
    </Card>
  );
}
