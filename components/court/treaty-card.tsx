import { getTranslations } from "next-intl/server";
import { adjournCase, signTreaty } from "@/app/cases/actions";
import { SignButton } from "@/components/court/sign-button";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { renderNames } from "@/lib/ai/names";
import type { ReportTexts } from "@/lib/ai/schemas";
import { FIXED_CLAUSES } from "@/lib/cases/treaty";

type Props = {
  caseId: string;
  names: { a: string; b: string };
  myName: string;
  mySigned: boolean;
  report: ReportTexts;
};

const clauseBox = "flex min-h-11 cursor-pointer items-start gap-3 rounded-field border border-hairline bg-surface px-3 py-2.5 text-body-md text-ink has-[:checked]:border-espresso has-[:checked]:bg-rose/20";

// The Peace Treaty: one required clause, personalised and silly optional ones, then sign.
export async function TreatyCard({ caseId, names, myName, mySigned, report }: Props) {
  const t = await getTranslations("treaty");
  const r = (text: string) => renderNames(text, names);

  const personal = [report.treaty_personal_1, report.treaty_personal_2, report.treaty_personal_3];

  return (
    <Card variant="verdict" className="flex flex-col gap-5 md:p-8">
      <div className="flex flex-col gap-1">
        <h2 className="text-headline-lg text-espresso">{t("title")}</h2>
        {!mySigned && <p className="text-body-md text-walnut">{t("intro")}</p>}
      </div>

      {mySigned ? (
        <div className="flex flex-col gap-1">
          <p className="text-label-docket uppercase text-walnut">{t("signedBy", { name: myName })}</p>
          <p className="font-[cursive] text-display-verdict text-espresso">{myName}</p>
        </div>
      ) : (
        <form action={signTreaty} className="flex flex-col gap-4">
          <input type="hidden" name="caseId" value={caseId} />

          <label className={`${clauseBox} border-espresso bg-rose/20`}>
            <input type="checkbox" checked disabled readOnly className="mt-0.5 size-5 accent-espresso" />
            <span>{t("required")}</span>
          </label>

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-label-docket uppercase text-walnut">{t("personalHeading")}</legend>
            {personal.map((text, i) => (
              <label key={i} className={clauseBox}>
                <input type="checkbox" name="clauses" value={`personal_${i + 1}`} className="mt-0.5 size-5 accent-espresso" />
                <span className="break-words">{r(text)}</span>
              </label>
            ))}
          </fieldset>

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-label-docket uppercase text-walnut">{t("optionalHeading")}</legend>
            {FIXED_CLAUSES.map((id) => (
              <label key={id} className={clauseBox}>
                <input type="checkbox" name="clauses" value={id} className="mt-0.5 size-5 accent-espresso" />
                <span>{t(`clauses.${id}`)}</span>
              </label>
            ))}
          </fieldset>

          <SignButton />
        </form>
      )}

      {/* No deadlock: either partner can close the case without a treaty. */}
      <details className="border-t border-hairline pt-4 print:hidden">
        <summary className="cursor-pointer text-body-sm text-walnut underline focus-visible:outline-2 focus-visible:outline-espresso">
          {t("adjourn")}
        </summary>
        <form action={adjournCase} className="mt-3 flex flex-col gap-3">
          <input type="hidden" name="caseId" value={caseId} />
          <p className="text-body-sm font-medium text-espresso">{t("adjournTitle")}</p>
          <p className="text-body-sm text-walnut">{t("adjournBody")}</p>
          <Button type="submit" variant="secondary" className="self-start">
            {t("adjournConfirm")}
          </Button>
        </form>
      </details>
    </Card>
  );
}
