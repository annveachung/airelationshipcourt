import { getTranslations } from "next-intl/server";
import { AdviceScreen } from "@/components/court/advice-screen";
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

type Props = {
  caseId: string;
  stage: CaseStage;
  locale: Locale;
  names: { a: string; b: string };
  userIds: { a: string; b: string };
  iAmA: boolean;
  mySigned: boolean;
  partnerName: string;
  bundle: VerdictBundle;
  errorText: string | null;
};

// Everything from the verdict onward: verdict -> advice -> report (+ treaty). A CLOSED case is
// shown on its report page instead (the case page redirects there).
export async function VerdictFlow({
  caseId,
  stage,
  locale,
  names,
  userIds,
  iAmA,
  mySigned,
  partnerName,
  bundle,
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

  const signed = {
    a: bundle.signatures.some((s) => s.userId === userIds.a),
    b: bundle.signatures.some((s) => s.userId === userIds.b),
  };
  const reportBlocked = stage === "REPORT";
  const needsReportWork = !bundle.reportReady || bundle.needsReportTranslation;

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
                iAmA={iAmA}
                signed={signed}
                report={bundle.reportTexts}
              />
              {mySigned && (
                <Card className="print:hidden">
                  <WaitingScreen
                    title={tTreaty("waitingTitle", { name: partnerName })}
                    message={tTreaty("waitingBody")}
                  />
                </Card>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
