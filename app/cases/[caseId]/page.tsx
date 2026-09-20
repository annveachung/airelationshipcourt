import { notFound, redirect } from "next/navigation";
import { FollowUpForm, type FollowUpQuestionRow } from "@/components/court/follow-up-form";
import { TestimonyForm } from "@/components/court/testimony-form";
import { WaitingScreen } from "@/components/court/waiting-screen";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PageWithSidebar } from "@/components/ui/page";
import { STAGE_LABELS, type CaseStage } from "@/lib/cases/stages";
import { caseError } from "@/lib/cases/testimony";
import { getMyCouple } from "@/lib/couples";
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
  const error = caseError((await searchParams).error);
  const initial = {
    stage,
    aSubmitted: status.a_submitted,
    bSubmitted: status.b_submitted,
    aFollowedUp: status.a_followed_up,
    bFollowedUp: status.b_followed_up,
    failed: status.failed,
  };

  let main;
  if (stage === "TESTIMONY" && !mySubmitted) {
    main = (
      <Card className="flex flex-col gap-6 md:p-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-headline-lg text-espresso">Your testimony</h2>
          <p className="text-body-md text-walnut">
            Tell the court what happened, in your own words. {couple.partner.name} can&apos;t see
            this until the verdict.
          </p>
        </div>
        {error && (
          <p role="alert" className="text-body-sm text-error">
            {error}
          </p>
        )}
        <TestimonyForm caseId={caseId} />
      </Card>
    );
  } else if (stage === "TESTIMONY") {
    main = (
      <Card>
        <WaitingScreen
          caseId={caseId}
          initial={initial}
          title={`Waiting for ${couple.partner.name}`}
          message="Your testimony is filed. The court will move on as soon as your partner has given theirs. This page updates by itself."
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
          errorMessage={theCase.last_error}
          title="The court is analysing the case"
          message="Both testimonies are in. The court is reading them and preparing your follow-up questions — this can take up to a minute. This page updates by itself."
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
          <h2 className="text-headline-lg text-espresso">The court has a few questions</h2>
          <p className="text-body-md text-walnut">
            Having read both accounts, the court needs a little more from you. This is the only
            round of questions.
          </p>
        </div>
        {error && (
          <p role="alert" className="text-body-sm text-error">
            {error}
          </p>
        )}
        {questions && questions.length > 0 ? (
          <FollowUpForm caseId={caseId} questions={questions as FollowUpQuestionRow[]} />
        ) : (
          <p className="text-body-md text-walnut">Your questions aren&apos;t ready yet. Try refreshing.</p>
        )}
      </Card>
    );
  } else if (stage === "FOLLOW_UP") {
    main = (
      <Card>
        <WaitingScreen
          caseId={caseId}
          initial={initial}
          title={`Waiting for ${couple.partner.name}'s answers`}
          message="Your answers are in. The court will move on as soon as your partner has answered theirs. This page updates by itself."
        />
      </Card>
    );
  } else if (stage === "PANEL_JUDGEMENT") {
    main = (
      <Card>
        <WaitingScreen
          caseId={caseId}
          initial={initial}
          title="The panel is deliberating"
          message="All the evidence is in. The verdict arrives in the next phase of the build."
        />
      </Card>
    );
  } else {
    main = (
      <Card>
        <WaitingScreen
          caseId={caseId}
          initial={initial}
          title={STAGE_LABELS[stage]}
          message="This part of the court is still being built."
        />
      </Card>
    );
  }

  const statusLine = (name: string, done: boolean, doneText: string) => (
    <li className="flex items-center justify-between gap-3 text-body-sm">
      <span className="text-ink">{name}</span>
      <span className={done ? "text-espresso" : "text-walnut"}>{done ? doneText : "Not yet"}</span>
    </li>
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Badge>
          Case #{caseId.slice(0, 4).toUpperCase()} · {STAGE_LABELS[stage]}
        </Badge>
        <h1 className="break-words text-headline-lg text-espresso md:text-display-verdict">
          {theCase.title}
        </h1>
      </div>
      <PageWithSidebar
        sidebar={
          <Card className="flex flex-col gap-3">
            <h2 className="text-label-docket uppercase text-walnut">Case details</h2>
            {theCase.context && (
              <p className="break-words text-body-md text-ink">{theCase.context}</p>
            )}
            <ul className="flex flex-col gap-2 border-t border-hairline pt-3">
              {statusLine(`${couple.me.name} (you)`, mySubmitted, "Testified")}
              {statusLine(couple.partner.name, partnerSubmitted, "Testified")}
            </ul>
            {(stage === "FOLLOW_UP" || stage === "PANEL_JUDGEMENT") && (
              <ul className="flex flex-col gap-2 border-t border-hairline pt-3">
                <li className="text-label-docket uppercase text-walnut">Follow-up questions</li>
                {statusLine(`${couple.me.name} (you)`, myFollowedUp, "Answered")}
                {statusLine(couple.partner.name, partnerFollowedUp, "Answered")}
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
