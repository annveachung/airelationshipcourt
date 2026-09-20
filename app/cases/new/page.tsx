import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { NewCaseForm } from "@/components/court/new-case-form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Page } from "@/components/ui/page";
import { SectionHeading } from "@/components/ui/section-heading";
import { toCaseErrorKey } from "@/lib/error-keys";
import { getMyCouple } from "@/lib/couples";
import { createClient } from "@/lib/supabase/server";

export default async function NewCasePage({ searchParams }: PageProps<"/cases/new">) {
  const t = await getTranslations("newCase");
  const tErr = await getTranslations("caseErrors");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const couple = await getMyCouple(user.id);
  const errorKey = toCaseErrorKey((await searchParams).error);

  if (couple.kind !== "active") {
    return (
      <Page className="gap-4">
        <SectionHeading label={t("label")} title={t("title")} />
        <Card className="flex flex-col gap-4">
          <p className="text-body-md text-ink">{t("needCouple")}</p>
          <Button href={couple.kind === "none" ? "/couple/new" : "/couple/invite"}>
            {couple.kind === "none" ? t("createCouple") : t("invitePartner")}
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
        <SectionHeading label={t("label")} title={t("title")} />
        <Card className="flex flex-col gap-4">
          <p className="text-body-md text-ink">
            {t.rich("alreadyOpen", { title: open.title, strong: (chunks) => <strong>{chunks}</strong> })}
          </p>
          <Button href={`/cases/${open.id}`}>{t("goOpen")}</Button>
        </Card>
      </Page>
    );
  }

  return (
    <Page className="gap-4">
      <SectionHeading label={t("label")} title={t("title")} />
      <Card className="flex flex-col gap-5 md:p-6">
        <p className="text-body-md text-walnut">{t("intro")}</p>
        {errorKey && (
          <p role="alert" className="text-body-sm text-error">
            {tErr(errorKey)}
          </p>
        )}
        <NewCaseForm />
        <Link href="/" className="text-body-sm text-walnut underline">
          {t("back")}
        </Link>
      </Card>
    </Page>
  );
}
