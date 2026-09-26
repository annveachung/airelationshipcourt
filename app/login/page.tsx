import { ChevronDown } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { DevOriginHint } from "@/components/auth/dev-origin-hint";
import { GoogleButton } from "@/components/auth/google-button";
import { GradientBackdrop } from "@/components/auth/gradient-backdrop";
import { CourtSeal } from "@/components/court/court-seal";
import { Card } from "@/components/ui/card";
import { Page } from "@/components/ui/page";
import { safeNext } from "@/lib/auth";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const t = await getTranslations("login");
  const params = await searchParams;
  const next = safeNext(typeof params.next === "string" ? params.next : null);
  const failed = params.error === "signin_failed";

  return (
    <div>
      {/* Hero: the first thing a new visitor sees. Bleeds past the shell's own padding so the
          gradient reaches the viewport edges; the shell's header stays (small brand bar). */}
      <section className="relative -mx-5 -mt-6 flex min-h-[calc(100dvh-4rem)] flex-col items-center justify-center gap-6 overflow-hidden px-5 text-center md:-mx-8 md:-mt-10 md:px-8">
        <GradientBackdrop />
        <CourtSeal className="size-20" />
        <div className="flex flex-col gap-3">
          <h1 className="text-display-verdict text-espresso md:text-[56px] md:leading-[60px]">{t("title")}</h1>
          <p className="mx-auto max-w-md text-body-lg text-walnut">{t("heroTagline")}</p>
        </div>
        <a
          href="#signin"
          className="absolute bottom-8 flex flex-col items-center gap-1 text-walnut focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-espresso"
        >
          <span className="sr-only">{t("scrollHint")}</span>
          <ChevronDown size={28} aria-hidden className="animate-bounce" />
        </a>
      </section>

      {/* Sign in: the arrow above scrolls here. */}
      <div id="signin" className="pt-10">
        <Page>
          <h2 className="text-headline-lg text-espresso">{t("subtitle")}</h2>
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
      </div>
    </div>
  );
}
