import { Scale } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { DevOriginHint } from "@/components/auth/dev-origin-hint";
import { GoogleButton } from "@/components/auth/google-button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Page } from "@/components/ui/page";
import { safeNext } from "@/lib/auth";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const t = await getTranslations("login");
  const params = await searchParams;
  const next = safeNext(typeof params.next === "string" ? params.next : null);
  const failed = params.error === "signin_failed";

  return (
    <Page className="pt-6 md:pt-16">
      <div className="flex flex-col items-start gap-3">
        <Scale size={36} className="text-espresso" aria-hidden />
        <Badge>{t("badge")}</Badge>
        <h1 className="text-display-verdict text-espresso">{t("title")}</h1>
        <p className="text-body-lg text-walnut">{t("subtitle")}</p>
      </div>
      <Card variant="verdict" className="flex flex-col gap-4">
        {failed && (
          <p role="alert" className="text-body-sm text-error">
            {t("failed")}
          </p>
        )}
        <GoogleButton next={next} />
      </Card>
      <DevOriginHint />
    </Page>
  );
}
