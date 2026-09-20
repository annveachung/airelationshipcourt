import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { acceptInvite } from "@/app/couple/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Page } from "@/components/ui/page";
import { SectionHeading } from "@/components/ui/section-heading";
import { getMyCouple, INVITE_CODE_PATTERN } from "@/lib/couples";
import { toInviteErrorKey } from "@/lib/error-keys";
import { createClient } from "@/lib/supabase/server";

export default async function JoinPage({ params, searchParams }: PageProps<"/join/[code]">) {
  const t = await getTranslations("join");
  const tErr = await getTranslations("inviteErrors");
  const { code } = await params;
  const errorKey = toInviteErrorKey((await searchParams).error);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/join/${code}`)}`);

  // Validate the shape before touching the database.
  const valid = INVITE_CODE_PATTERN.test(code);
  let inviter: string | null = null;
  if (valid) {
    const { data } = await supabase.rpc("invite_preview", { invite_code: code });
    inviter = (data as { inviter_name: string }[] | null)?.[0]?.inviter_name ?? null;
  }

  const alreadyInCouple = (await getMyCouple(user.id)).kind !== "none";

  return (
    <Page className="gap-4">
      <SectionHeading label={t("label")} title={t("title")} />
      <Card variant="verdict" className="flex flex-col gap-4">
        {!inviter ? (
          <p role="alert" className="text-body-md text-error">
            {errorKey ? tErr(errorKey) : t("invalid")}
          </p>
        ) : alreadyInCouple ? (
          <p className="text-body-md text-ink">{t("already")}</p>
        ) : (
          <>
            <p className="text-body-md text-ink">
              {t.rich("body", { inviter, strong: (chunks) => <strong>{chunks}</strong> })}
            </p>
            {errorKey && (
              <p role="alert" className="text-body-sm text-error">
                {tErr(errorKey)}
              </p>
            )}
            <form action={acceptInvite}>
              <input type="hidden" name="code" value={code} />
              <Button type="submit" className="w-full">
                {t("submit")}
              </Button>
            </form>
          </>
        )}
      </Card>
    </Page>
  );
}
