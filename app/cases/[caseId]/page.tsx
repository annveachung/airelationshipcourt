import { getTranslations } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import { FollowUpForm, type FollowUpQuestionRow } from "@/components/court/follow-up-form";
import { TestimonyForm } from "@/components/court/testimony-form";
import { WaitingScreen } from "@/components/court/waiting-screen";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PageWithSidebar } from "@/components/ui/page";
import type { CaseStage } from "@/lib/cases/stages";
import { getMyCouple } from "@/lib/couples";
import { toAiErrorKey, toCaseErrorKey } from "@/lib/error-keys";
import { createClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type StatusRow = {
  stage: CaseStage;
  a_submitted: boolean;
  b_submitted: boolean;
  a_followed_up: boolean;
  b_followed_up: boolean;
  failed: boolean;
};

export default async function CasePage({ params, searchParams }: PageProps<"/cases/[caseId]">) {
  const t = await getTranslations("casePage");
  const tStages = await getTranslations("stages");
  const tErr = await getTranslations("caseErrors");
  const tRoles = await getTranslations("roles");

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
    .select("id, title, context, stage, last_error")
    .eq("id", caseId)
    .maybeSingle();
  if (!theCase) notFound();

  const couple = await getMyCouple(user.id);
  if (couple.kind !== "active") notFound();

  const { data } = await supabase.rpc("case_submission_status", { the_case: caseId });
  const status = (data as StatusRow[] | null)?.[0];
  if (!status) notFound();

  const stage = theCase.stage as CaseStage;
  const iAmA = couple.me.role === "partner_a";
  const mySubmitted = iAmA ? status.a_submitted : status.b_submitted;
  const partnerSubmitted = iAmA ? status.b_submitted : status.a_submitted;
  const myFollowedUp = iAmA ? status.a_followed_up : status.b_followed_up;
  const partnerFollowedUp = iAmA ? status.b_followed_up : status.a_followed_up;
  const errorKey = toCaseErrorKey((await searchParams).error);
  const partner = couple.partner.name;
  const initial = {
    stage,
    aSubmitted: status.a_submitted,
    bSubmitted: status.b_submitted,
    aFollowedUp: status.a_followed_up,
    bFollowedUp: status.b_followed_up,
    failed: status.failed,
  };

  const errorBanner = errorKey && (
    <p role="alert" className="text-body-sm text-error">
      {tErr(errorKey)}
    </p>
  );

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
          caseId={caseId}
          initial={initial}
          title={t("waitingForPartner", { partner })}
          message={t("waitingTestimony")}
        />
      </Card>
    );
  } else if (stage === "ANALYSIS") {
    main = (
      <Card>
        <WaitingScreen
          caseId={caseId}
          initial={initial}
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
          caseId={caseId}
          initial={initial}
          title={t("waitingAnswers", { partner })}
          message={t("waitingAnswersBody")}
        />
      </Card>
    );
  } else if (stage === "PANEL_JUDGEMENT") {
    main = (
      <Card>
        <WaitingScreen
          caseId={caseId}
          initial={initial}
          title={t("panelTitle")}
          message={t("panelBody")}
        />
      </Card>
    );
  } else {
    main = (
      <Card>
        <WaitingScreen
          caseId={caseId}
          initial={initial}
          title={tStages(stage)}
          message={t("stillBuilding")}
        />
      </Card>
    );
  }

  const statusLine = (name: string, done: boolean, doneText: string) => (
    <li className="flex items-center justify-between gap-3 text-body-sm">
      <span className="text-ink">{name}</span>
      <span className={done ? "text-espresso" : "text-walnut"}>{done ? doneText : t("notYet")}</span>
    </li>
  );
  const me = `${couple.me.name} ${tRoles("you")}`;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Badge>{t("badge", { id: caseId.slice(0, 4).toUpperCase(), stage: tStages(stage) })}</Badge>
        <h1 className="break-words text-headline-lg text-espresso md:text-display-verdict">
          {theCase.title}
        </h1>
      </div>
      <PageWithSidebar
        sidebar={
          <Card className="flex flex-col gap-3">
            <h2 className="text-label-docket uppercase text-walnut">{t("details")}</h2>
            {theCase.context && (
              <p className="break-words text-body-md text-ink">{theCase.context}</p>
            )}
            <ul className="flex flex-col gap-2 border-t border-hairline pt-3">
              {statusLine(me, mySubmitted, t("testified"))}
              {statusLine(partner, partnerSubmitted, t("testified"))}
            </ul>
            {(stage === "FOLLOW_UP" || stage === "PANEL_JUDGEMENT") && (
              <ul className="flex flex-col gap-2 border-t border-hairline pt-3">
                <li className="text-label-docket uppercase text-walnut">{t("followUpHeading")}</li>
                {statusLine(me, myFollowedUp, t("answered"))}
                {statusLine(partner, partnerFollowedUp, t("answered"))}
              </ul>
            )}
          </Card>
        }
      >
        {main}
      </PageWithSidebar>
    </div>
  );
}
