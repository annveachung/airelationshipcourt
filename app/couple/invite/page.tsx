import { redirect } from "next/navigation";
import { refreshInvite } from "@/app/couple/actions";
import { InviteLinkCard } from "@/components/auth/invite-link-card";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";
import { friendlyError, getMyCouple, inviteLink } from "@/lib/couples";
import { createClient } from "@/lib/supabase/server";

export default async function InvitePage({ searchParams }: PageProps<"/couple/invite">) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const couple = await getMyCouple(user.id);
  if (couple.kind === "none") redirect("/couple/new");
  if (couple.kind === "active") redirect("/");

  const { data: code } = await supabase.rpc("my_open_invite");
  const link = typeof code === "string" ? await inviteLink(code) : null;
  const error = friendlyError((await searchParams).error);

  return (
    <div className="flex flex-col gap-4">
      <SectionHeading label="Registry" title="Invite your partner" />
      <Card className="flex flex-col gap-4">
        <p className="text-body-md text-ink">
          Send this link to your partner. It works once and expires in 7 days.
        </p>
        {error && (
          <p role="alert" className="text-body-sm text-error">
            {error}
          </p>
        )}
        {link ? (
          <InviteLinkCard link={link} />
        ) : (
          <form action={refreshInvite}>
            <p className="mb-3 text-body-sm text-walnut">
              Your previous invite has expired or been used.
            </p>
            <Button type="submit" className="w-full">
              Create a new invite link
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
}
