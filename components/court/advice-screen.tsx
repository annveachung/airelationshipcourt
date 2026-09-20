import { getTranslations } from "next-intl/server";
import { continueCase } from "@/app/cases/actions";
import { ChargeList } from "@/components/court/charge-list";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { renderNames } from "@/lib/ai/names";
import type { VerdictTexts } from "@/lib/ai/schemas";
import type { VerdictCharges } from "@/lib/cases/charges";

type Props = {
  caseId: string;
  names: { a: string; b: string };
  iAmA: boolean;
  texts: VerdictTexts;
  charges: VerdictCharges;
  reportReady: boolean;
  showContinue: boolean;
};

// Feedback (yours first), joint feedback, suggestions and the playful charges.
export async function AdviceScreen({ caseId, names, iAmA, texts, charges, reportReady, showContinue }: Props) {
  const t = await getTranslations("advice");
  const r = (text: string) => renderNames(text, names);

  const mine = {
    name: iAmA ? names.a : names.b,
    feedback: iAmA ? texts.feedback_partner_a : texts.feedback_partner_b,
    suggestion: iAmA ? texts.suggestion_partner_a : texts.suggestion_partner_b,
  };
  const theirs = {
    name: iAmA ? names.b : names.a,
    feedback: iAmA ? texts.feedback_partner_b : texts.feedback_partner_a,
    suggestion: iAmA ? texts.suggestion_partner_b : texts.suggestion_partner_a,
  };

  const person = (title: string, p: { feedback: string; suggestion: string }) => (
    <Card className="flex flex-col gap-3">
      <h3 className="text-headline-sm text-espresso">{title}</h3>
      <p className="break-words text-body-md text-ink">{r(p.feedback)}</p>
      <p className="break-words border-t border-hairline pt-3 text-body-sm text-walnut">
        <strong>{t("suggestion")}:</strong> {r(p.suggestion)}
      </p>
    </Card>
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-headline-lg text-espresso md:text-display-verdict">{t("title")}</h2>
        <p className="text-body-md text-walnut">{t("intro")}</p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {person(t("forYou"), mine)}
        {person(t("forPartner", { name: theirs.name }), theirs)}
      </div>

      <Card className="flex flex-col gap-3">
        <h3 className="text-headline-sm text-espresso">{t("jointTitle")}</h3>
        <p className="break-words text-body-md text-ink">{r(texts.joint_feedback)}</p>
        <p className="break-words border-t border-hairline pt-3 text-body-sm text-walnut">
          {r(texts.suggestion_together)}
        </p>
      </Card>

      <Card className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h3 className="text-headline-md text-espresso">{t("chargesTitle")}</h3>
          <p className="text-body-sm text-walnut">{t("chargesIntro")}</p>
        </div>
        <ChargeList charges={charges} names={names} customA={texts.charge_custom_a} customB={texts.charge_custom_b} />
      </Card>

      {showContinue && (
        <form action={continueCase} className="flex flex-col gap-2 print:hidden">
          <input type="hidden" name="caseId" value={caseId} />
          <Button type="submit" disabled={!reportReady} className="w-full md:w-auto md:px-10">
            {t("continueReport")}
          </Button>
          {!reportReady && <p className="text-body-sm text-walnut">{t("preparing")}</p>}
        </form>
      )}
    </div>
  );
}
