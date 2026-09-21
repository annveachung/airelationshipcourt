import { getLocale, getTranslations } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import { CaseLive } from "@/components/court/case-live";
import { CourtStatusFull, CourtStatusStrip } from "@/components/court/court-status-panel";
import { FollowUpForm, type FollowUpQuestionRow } from "@/components/court/follow-up-form";
import { TestimonyForm } from "@/components/court/testimony-form";
import { VerdictFlow } from "@/components/court/verdict-flow";
import { WaitingScreen } from "@/components/court/waiting-screen";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PageWithSidebar } from "@/components/ui/page";
import { CASE_STAGES, type CaseStage } from "@/lib/cases/stages";
import { toCourtStatus, type CourtStatusRow } from "@/lib/cases/court-status";
import { loadVerdictBundle } from "@/lib/cases/verdict-data";
import type { Locale } from "@/lib/i18n";
import { getMyCouple } from "@/lib/couples";
import { toAiErrorKey, toCaseErrorKey } from "@/lib/error-keys";
import { createClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function CasePage({ params, searchParams }: PageProps<"/cases/[caseId]">) {
  const t = await getTranslations("casePage");
  const tStages = await getTranslations("stages");
  const tErr = await getTranslations("caseErrors");

  const { caseId } = await params;
  if (!UUID.test(caseId)) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Row Level Security only returns cases belonging to my couple.
  const { data: theCase } = await supabase
    .from("cases")
    .select("id, title, context, stage, last_error, closed_reason")
    .eq("id", caseId)
    .maybeSingle();
  if (!theCase) notFound();

  const couple = await getMyCouple(user.id);
  if (couple.kind !== "active") notFound();

  const { data } = await supabase.rpc("court_status", { the_case: caseId });
  const row = (data as CourtStatusRow[] | null)?.[0];
  if (!row) notFound();
  const status = toCourtStatus(row);

  const stage = theCase.stage as CaseStage;
  const iAmA = couple.me.role === "partner_a";
  const mySubmitted = iAmA ? status.aSubmitted : status.bSubmitted;
  const myFollowedUp = iAmA ? status.aFollowedUp : status.bFollowedUp;
  const errorKey = toCaseErrorKey((await searchParams).error);
  const names = {
    a: iAmA ? couple.me.name : couple.partner.name,
    b: iAmA ? couple.partner.name : couple.me.name,
  };

  const partner = couple.partner.name;

  const errorBanner = errorKey && (
    <p role="alert" className="text-body-sm text-error">
      {tErr(errorKey)}
    </p>
  );

  const afterVerdict = CASE_STAGES.indexOf(stage) >= CASE_STAGES.indexOf("VERDICT");

  let main;
  if (stage === "TESTIMONY" && !mySubmitted) {
    main = (
      <Card className="flex flex-col gap-6 md:p-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-headline-lg text-espresso">{t("testimonyTitle")}</h2>
          <p className="text-body-md text-walnut">{t("testimonyIntro", { partner })}</p>
        </div>
        {errorBanner}
        <TestimonyForm caseId={caseId} />
      </Card>
    );
  } else if (stage === "TESTIMONY") {
    main = (
      <Card>
        <WaitingScreen
          title={t("waitingForPartner", { partner })}
          message={t("waitingTestimony")}
        />
      </Card>
    );
  } else if (stage === "ANALYSIS") {
    main = (
      <Card>
        <WaitingScreen
          drive
          errorKey={toAiErrorKey(theCase.last_error)}
          title={t("analysingTitle")}
          message={t("analysingBody")}
        />
      </Card>
    );
  } else if (stage === "FOLLOW_UP" && !myFollowedUp) {
    const { data: questions } = await supabase
      .from("follow_up_questions")
      .select("id, question_text, format, options, position")
      .eq("case_id", caseId)
      .eq("user_id", user.id)
      .order("position");
    main = (
      <Card className="flex flex-col gap-6 md:p-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-headline-lg text-espresso">{t("followUpTitle")}</h2>
          <p className="text-body-md text-walnut">{t("followUpIntro")}</p>
        </div>
        {errorBanner}
        {questions && questions.length > 0 ? (
          <FollowUpForm caseId={caseId} questions={questions as FollowUpQuestionRow[]} />
        ) : (
          <p className="text-body-md text-walnut">{t("questionsNotReady")}</p>
        )}
      </Card>
    );
  } else if (stage === "FOLLOW_UP") {
    main = (
      <Card>
        <WaitingScreen
          title={t("waitingAnswers", { partner })}
          message={t("waitingAnswersBody")}
        />
      </Card>
    );
  } else if (stage === "PANEL_JUDGEMENT") {
    main = (
      <Card>
        <WaitingScreen
          drive
          errorKey={toAiErrorKey(theCase.last_error)}
          title={t("panelTitle")}
          message={t("panelBody")}
        />
      </Card>
    );
  } else if (afterVerdict) {
    // Handled below: verdict, advice, report and closing use their own full-width layout.
    main = null;
  } else {
    main = (
      <Card>
        <WaitingScreen
          title={tStages(stage)}
          message={t("stillBuilding")}
        />
      </Card>
    );
  }

  if (afterVerdict) {
    const locale = (await getLocale()) as Locale;
    const bundle = await loadVerdictBundle(supabase, caseId, locale);
    const userIds = {
      a: iAmA ? couple.me.userId : couple.partner.userId,
      b: iAmA ? couple.partner.userId : couple.me.userId,
    };
    return (
      <CaseLive caseId={caseId} initial={status}>
      <div className="flex flex-col gap-6">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-3">
          <Badge>{t("badge", { id: caseId.slice(0, 4).toUpperCase(), stage: tStages(stage) })}</Badge>
          <h1 className="break-words text-headline-lg text-espresso md:text-display-verdict">
            {theCase.title}
          </h1>
        </div>
        <div className="mx-auto w-full max-w-3xl">
          <CourtStatusStrip caseId={caseId} names={names} context={theCase.context} />
        </div>
        <VerdictFlow
          caseId={caseId}
          stage={stage}
          closedReason={theCase.closed_reason as "treaty" | "adjourned" | null}
          locale={locale}
          names={names}
          userIds={userIds}
          iAmA={iAmA}
          mySigned={iAmA ? status.aSigned : status.bSigned}
          partnerName={partner}
          bundle={bundle}
          errorText={errorKey ? tErr(errorKey) : null}
        />
      </div>
      </CaseLive>
    );
  }

  const panelProps = { caseId, names, context: theCase.context };

  return (
    <CaseLive caseId={caseId} initial={status}>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-3">
          <Badge>{t("badge", { id: caseId.slice(0, 4).toUpperCase(), stage: tStages(stage) })}</Badge>
          <h1 className="break-words text-headline-lg text-espresso md:text-display-verdict">
            {theCase.title}
          </h1>
        </div>
        {/* Phones: a collapsible status strip above the case. Desktop: the full panel beside it. */}
        <div className="md:hidden">
          <CourtStatusStrip {...panelProps} />
        </div>
        <PageWithSidebar
          sidebar={
            <div className="hidden md:block">
              <CourtStatusFull {...panelProps} />
            </div>
          }
        >
          {main}
        </PageWithSidebar>
      </div>
    </CaseLive>
  );
}
