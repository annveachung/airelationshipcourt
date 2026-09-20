import { notFound, redirect } from "next/navigation";
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
    .select("id, title, context, stage")
    .eq("id", caseId)
    .maybeSingle();
  if (!theCase) notFound();

  const couple = await getMyCouple(user.id);
  if (couple.kind !== "active") notFound();

  const { data } = await supabase.rpc("case_submission_status", { the_case: caseId });
  const status = (
    data as { stage: CaseStage; a_submitted: boolean; b_submitted: boolean }[] | null
  )?.[0];
  if (!status) notFound();

  const stage = theCase.stage as CaseStage;
  const iAmA = couple.me.role === "partner_a";
  const mySubmitted = iAmA ? status.a_submitted : status.b_submitted;
  const partnerSubmitted = iAmA ? status.b_submitted : status.a_submitted;
  const error = caseError((await searchParams).error);
  const initial = { stage, aSubmitted: status.a_submitted, bSubmitted: status.b_submitted };

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
  } else {
    main = (
      <Card>
        <WaitingScreen
          caseId={caseId}
          initial={initial}
          title="The court is reviewing the case"
          message="Both testimonies are in. The analysis arrives in the next phase of the build."
        />
      </Card>
    );
  }

  const partnerLine = (name: string, done: boolean) => (
    <li className="flex items-center justify-between gap-3 text-body-sm">
      <span className="text-ink">{name}</span>
      <span className={done ? "text-espresso" : "text-walnut"}>{done ? "Testified" : "Not yet"}</span>
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
              {partnerLine(`${couple.me.name} (you)`, mySubmitted)}
              {partnerLine(couple.partner.name, partnerSubmitted)}
            </ul>
          </Card>
        }
      >
        {main}
      </PageWithSidebar>
    </div>
  );
}
