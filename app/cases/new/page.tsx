import Link from "next/link";
import { redirect } from "next/navigation";
import { NewCaseForm } from "@/components/court/new-case-form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Page } from "@/components/ui/page";
import { SectionHeading } from "@/components/ui/section-heading";
import { caseError } from "@/lib/cases/testimony";
import { getMyCouple } from "@/lib/couples";
import { createClient } from "@/lib/supabase/server";

export default async function NewCasePage({ searchParams }: PageProps<"/cases/new">) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const couple = await getMyCouple(user.id);
  const error = caseError((await searchParams).error);

  if (couple.kind !== "active") {
    return (
      <Page className="gap-4">
        <SectionHeading label="Docket" title="File a case" />
        <Card className="flex flex-col gap-4">
          <p className="text-body-md text-ink">
            A case needs both partners. Finish setting up your couple first.
          </p>
          <Button href={couple.kind === "none" ? "/couple/new" : "/couple/invite"}>
            {couple.kind === "none" ? "Create a couple" : "Invite your partner"}
          </Button>
        </Card>
      </Page>
    );
  }

  // One open case at a time.
  const { data: open } = await supabase
    .from("cases")
    .select("id, title")
    .neq("stage", "CLOSED")
    .maybeSingle();

  if (open) {
    return (
      <Page className="gap-4">
        <SectionHeading label="Docket" title="File a case" />
        <Card className="flex flex-col gap-4">
          <p className="text-body-md text-ink">
            You already have an open case: <strong>{open.title}</strong>. Finish it before filing
            another.
          </p>
          <Button href={`/cases/${open.id}`}>Go to your open case</Button>
        </Card>
      </Page>
    );
  }

  return (
    <Page className="gap-4">
      <SectionHeading label="Docket" title="File a case" />
      <Card className="flex flex-col gap-5 md:p-6">
        <p className="text-body-md text-walnut">
          Describe what the case is about. The court will name it, then both partners tell their side, privately.
        </p>
        {error && (
          <p role="alert" className="text-body-sm text-error">
            {error}
          </p>
        )}
        <NewCaseForm />
        <Link href="/" className="text-body-sm text-walnut underline">
          Back to docket
        </Link>
      </Card>
    </Page>
  );
}
