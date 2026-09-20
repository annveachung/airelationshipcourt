import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { createCouple } from "@/app/couple/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Page } from "@/components/ui/page";
import { SectionHeading } from "@/components/ui/section-heading";
import { getMyCouple } from "@/lib/couples";
import { toInviteErrorKey } from "@/lib/error-keys";
import { createClient } from "@/lib/supabase/server";

export default async function NewCouplePage({ searchParams }: PageProps<"/couple/new">) {
  const t = await getTranslations("couple");
  const tErr = await getTranslations("inviteErrors");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Already in a couple? Nothing to create.
  if ((await getMyCouple(user.id)).kind !== "none") redirect("/");

  const errorKey = toInviteErrorKey((await searchParams).error);

  return (
    <Page className="gap-4">
      <SectionHeading label={t("registry")} title={t("new.title")} />
      <Card className="flex flex-col gap-4">
        <p className="text-body-md text-ink">{t("new.body")}</p>
        {errorKey && (
          <p role="alert" className="text-body-sm text-error">
            {tErr(errorKey)}
          </p>
        )}
        <form action={createCouple}>
          <Button type="submit" className="w-full">
            {t("new.submit")}
          </Button>
        </form>
      </Card>
    </Page>
  );
}
