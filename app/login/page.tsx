import { ChevronDown } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { DevOriginHint } from "@/components/auth/dev-origin-hint";
import { GoogleButton } from "@/components/auth/google-button";
import { GradientBackdrop } from "@/components/auth/gradient-backdrop";
import { PixelScales } from "@/components/auth/pixel-scales";
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
      <GradientBackdrop />

      {/* Hero: the first thing a new visitor sees. The gradient behind it is fixed to the whole
          viewport; the shell's header stays (small brand bar). */}
      <section className="relative -mt-6 flex min-h-[calc(100dvh-4rem)] flex-col items-center justify-center gap-6 text-center md:-mt-10">
        <PixelScales />
        <div className="flex flex-col gap-3">
          {/* Always one line: Silkscreen sets this title about 17.7em wide, so the size scales
              with the screen (leaving the page padding) and caps at 52px on desktop. */}
          <h1
            className="whitespace-nowrap text-display-verdict leading-tight text-espresso"
            style={{ fontSize: "min(52px, calc((100vw - 3rem) / 17.7))" }}
          >
            {t("title")}
          </h1>
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
