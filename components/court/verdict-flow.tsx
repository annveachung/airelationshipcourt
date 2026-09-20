import { getTranslations } from "next-intl/server";
import { AdviceScreen } from "@/components/court/advice-screen";
import { ClosedBanner } from "@/components/court/closed-banner";
import { ReportDocument } from "@/components/court/report-document";
import { ReportPreparer } from "@/components/court/report-preparer";
import { StageStepper } from "@/components/court/stage-stepper";
import { TranslationGate } from "@/components/court/translation-gate";
import { TreatyCard } from "@/components/court/treaty-card";
import { VerdictScreen } from "@/components/court/verdict-screen";
import { WaitingScreen } from "@/components/court/waiting-screen";
import { Card } from "@/components/ui/card";
import { panelAgreement } from "@/lib/cases/panel-agreement";
import type { CaseStage } from "@/lib/cases/stages";
import type { VerdictBundle } from "@/lib/cases/verdict-data";
import type { Locale } from "@/lib/i18n";

type Status = {
  stage: string;
  aSubmitted: boolean;
  bSubmitted: boolean;
  aFollowedUp: boolean;
  bFollowedUp: boolean;
  failed: boolean;
  aSigned: boolean;
  bSigned: boolean;
  reportReady: boolean;
};

type Props = {
  caseId: string;
  stage: CaseStage;
  closedReason: "treaty" | "adjourned" | null;
  locale: Locale;
  names: { a: string; b: string };
  userIds: { a: string; b: string };
  iAmA: boolean;
  mySigned: boolean;
  partnerName: string;
  bundle: VerdictBundle;
  status: Status;
  errorText: string | null;
};

// Everything from the verdict onward: verdict -> advice -> report (+ treaty) -> closed.
export async function VerdictFlow({
  caseId,
  stage,
  closedReason,
  locale,
  names,
  userIds,
  iAmA,
  mySigned,
  partnerName,
  bundle,
  status,
  errorText,
}: Props) {
  const tVerdict = await getTranslations("verdict");
  const tReport = await getTranslations("report");
  const tTreaty = await getTranslations("treaty");
  const caseNumber = caseId.slice(0, 4).toUpperCase();
  const { verdict, verdictTexts: texts } = bundle;

  if (!verdict || !texts) {
    return (
      <Card>
        <p className="text-body-md text-walnut">{tVerdict("pending")}</p>
      </Card>
    );
  }

  const reportBlocked = stage === "REPORT" || stage === "CLOSED";
  const needsReportWork = !bundle.reportReady || bundle.needsReportTranslation;
  const testimonies = bundle.testimonies.map((x) => ({
    ...x,
    name: x.user_id === userIds.a ? names.a : names.b,
  }));

  const errorBanner = errorText && (
    <p role="alert" className="text-body-sm text-error">
      {errorText}
    </p>
  );

  const reportDoc = bundle.reportTexts && (
    <ReportDocument
      caseNumber={caseNumber}
      names={names}
      verdict={verdict}
      texts={texts}
      report={bundle.reportTexts}
      agreement={bundle.panelScores ? panelAgreement(bundle.panelScores) : null}
      testimonies={testimonies}
    />
  );

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <StageStepper stage={stage} />
      {bundle.needsVerdictTranslation && <TranslationGate caseId={caseId} locale={locale} />}
      {needsReportWork && <ReportPreparer caseId={caseId} locale={locale} showNote={reportBlocked && !bundle.reportTexts} />}
      {errorBanner}

      {stage === "VERDICT" && (
        <VerdictScreen
          caseId={caseId}
          caseNumber={caseNumber}
          names={names}
          finalA={verdict.finalA}
          finalB={verdict.finalB}
          moreResponsible={verdict.moreResponsible}
          decidedBy={verdict.decidedBy}
          texts={texts}
          panel={bundle.panel}
          showContinue
        />
      )}

      {stage === "RECOMMENDATIONS" && (
        <AdviceScreen
          caseId={caseId}
          names={names}
          iAmA={iAmA}
          texts={texts}
          charges={verdict.charges}
          reportReady={bundle.reportReady}
          showContinue
        />
      )}

      {stage === "REPORT" && (
        <>
          {reportDoc ?? (
            <Card>
              <p className="text-body-md text-walnut">{tReport("pending")}</p>
            </Card>
          )}
          {bundle.reportTexts && (
            <>
              <TreatyCard
                caseId={caseId}
                names={names}
                myName={iAmA ? names.a : names.b}
                mySigned={mySigned}
                report={bundle.reportTexts}
              />
              {mySigned && (
                <Card className="print:hidden">
                  <WaitingScreen
                    caseId={caseId}
                    initial={status}
                    title={tTreaty("waitingTitle", { name: partnerName })}
                    message={tTreaty("waitingBody")}
                  />
                </Card>
              )}
            </>
          )}
        </>
      )}

      {stage === "CLOSED" && (
        <>
          <ClosedBanner closedReason={closedReason} signatures={bundle.signatures} names={names} />
          {reportDoc}
        </>
      )}
    </div>
  );
}
