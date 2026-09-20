import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { refreshInvite } from "@/app/couple/actions";
import { InviteLinkCard } from "@/components/auth/invite-link-card";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Page } from "@/components/ui/page";
import { SectionHeading } from "@/components/ui/section-heading";
import { getMyCouple, inviteLink } from "@/lib/couples";
import { toInviteErrorKey } from "@/lib/error-keys";
import { createClient } from "@/lib/supabase/server";

export default async function InvitePage({ searchParams }: PageProps<"/couple/invite">) {
  const t = await getTranslations("couple");
  const tErr = await getTranslations("inviteErrors");
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
  const errorKey = toInviteErrorKey((await searchParams).error);

  return (
    <Page className="gap-4">
      <SectionHeading label={t("registry")} title={t("invite.title")} />
      <Card className="flex flex-col gap-4">
        <p className="text-body-md text-ink">{t("invite.body")}</p>
        {errorKey && (
          <p role="alert" className="text-body-sm text-error">
            {tErr(errorKey)}
          </p>
        )}
        {link ? (
          <InviteLinkCard link={link} />
        ) : (
          <form action={refreshInvite}>
            <p className="mb-3 text-body-sm text-walnut">{t("invite.expired")}</p>
            <Button type="submit" className="w-full">
              {t("invite.renew")}
            </Button>
          </form>
        )}
      </Card>
    </Page>
  );
}
