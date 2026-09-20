import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PrintButton } from "@/components/court/print-button";
import { ReportDocument } from "@/components/court/report-document";
import { ReportPreparer } from "@/components/court/report-preparer";
import { TranslationGate } from "@/components/court/translation-gate";
import { Card } from "@/components/ui/card";
import { panelAgreement } from "@/lib/cases/panel-agreement";
import { CASE_STAGES, type CaseStage } from "@/lib/cases/stages";
import { loadVerdictBundle } from "@/lib/cases/verdict-data";
import { getMyCouple } from "@/lib/couples";
import type { Locale } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// A permanent link to the written report (also what the Docket opens for closed cases).
export default async function ReportPage({ params }: PageProps<"/cases/[caseId]/report">) {
  const t = await getTranslations("report");
  const tCase = await getTranslations("casePage");
  const { caseId } = await params;
  if (!UUID.test(caseId)) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: theCase } = await supabase
    .from("cases")
    .select("id, title, stage")
    .eq("id", caseId)
    .maybeSingle();
  if (!theCase) notFound();

  const stage = theCase.stage as CaseStage;
  // The report only exists once the case reaches the report stage.
  if (CASE_STAGES.indexOf(stage) < CASE_STAGES.indexOf("REPORT")) redirect(`/cases/${caseId}`);

  const couple = await getMyCouple(user.id);
  if (couple.kind !== "active") notFound();

  const locale = (await getLocale()) as Locale;
  const bundle = await loadVerdictBundle(supabase, caseId, locale);
  const iAmA = couple.me.role === "partner_a";
  const names = {
    a: iAmA ? couple.me.name : couple.partner.name,
    b: iAmA ? couple.partner.name : couple.me.name,
  };
  const userIds = {
    a: iAmA ? couple.me.userId : couple.partner.userId,
    b: iAmA ? couple.partner.userId : couple.me.userId,
  };
  const { verdict, verdictTexts: texts, reportTexts: report } = bundle;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div className="flex flex-col gap-3 print:hidden">
        <Link href={`/cases/${caseId}`} className="text-body-sm text-walnut underline">
          {tCase("backToCase")}
        </Link>
        <h1 className="break-words text-headline-lg text-espresso md:text-display-verdict">{theCase.title}</h1>
        {report && verdict && texts && <PrintButton />}
      </div>

      {bundle.needsVerdictTranslation && <TranslationGate caseId={caseId} locale={locale} />}
      {(!bundle.reportReady || bundle.needsReportTranslation) && (
        <ReportPreparer caseId={caseId} locale={locale} showNote={!report} />
      )}

      {report && verdict && texts ? (
        <ReportDocument
          caseNumber={caseId.slice(0, 4).toUpperCase()}
          names={names}
          verdict={verdict}
          texts={texts}
          report={report}
          agreement={bundle.panelScores ? panelAgreement(bundle.panelScores) : null}
              testimonies={bundle.testimonies.map((x) => ({
            ...x,
            name: x.user_id === userIds.a ? names.a : names.b,
          }))}
        />
      ) : (
        <Card>
          <p className="text-body-md text-walnut">{t("pending")}</p>
        </Card>
      )}
    </div>
  );
}
