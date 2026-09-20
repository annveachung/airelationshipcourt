import { redirect } from "next/navigation";
import { createCouple } from "@/app/couple/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Page } from "@/components/ui/page";
import { SectionHeading } from "@/components/ui/section-heading";
import { friendlyError, getMyCouple } from "@/lib/couples";
import { createClient } from "@/lib/supabase/server";

export default async function NewCouplePage({ searchParams }: PageProps<"/couple/new">) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Already in a couple? Nothing to create.
  if ((await getMyCouple(user.id)).kind !== "none") redirect("/");

  const error = friendlyError((await searchParams).error);

  return (
    <Page className="gap-4">
      <SectionHeading label="Registry" title="Create your couple" />
      <Card className="flex flex-col gap-4">
        <p className="text-body-md text-ink">
          You&apos;ll be Partner A. We&apos;ll give you a private invite link to send to
          your partner. Once they join, you can file your first case.
        </p>
        {error && (
          <p role="alert" className="text-body-sm text-error">
            {error}
          </p>
        )}
        <form action={createCouple}>
          <Button type="submit" className="w-full">
            Create couple &amp; get invite link
          </Button>
        </form>
      </Card>
    </Page>
  );
}
