"use client";

import { useTranslations } from "next-intl";
import { Hourglass, TriangleAlert } from "lucide-react";
import { useCaseLive } from "@/components/court/case-live";
import { Button } from "@/components/ui/button";
import type { AiErrorKey } from "@/lib/error-keys";

// Shown while the case waits on a partner or on the court's AI. It doesn't poll: the page's
// <CaseLive> provider does that once, for this screen and the Court Status panel together.
// With `drive`, a failed AI step shows a friendly error and a "Try again" button.
export function WaitingScreen({
  title,
  message,
  drive = false,
  errorKey = null,
}: {
  title: string;
  message: string;
  drive?: boolean;
  errorKey?: AiErrorKey | null;
}) {
  const t = useTranslations("waiting");
  const tErr = useTranslations("aiErrors");
  const { retry, retrying } = useCaseLive();

  if (errorKey) {
    return (
      <div role="alert" className="flex flex-col items-center gap-3 py-6 text-center">
        <TriangleAlert size={32} className="text-error" aria-hidden />
        <h2 className="text-headline-md text-espresso">{t("snagTitle")}</h2>
        <p className="max-w-sm text-body-md text-walnut">{tErr(errorKey)}</p>
        {drive && (
          <Button disabled={retrying} onClick={() => void retry()}>
            {retrying ? t("retrying") : t("retry")}
          </Button>
        )}
      </div>
    );
  }

  return (
    <div role="status" className="flex flex-col items-center gap-3 py-6 text-center">
      <Hourglass size={32} className="text-walnut" aria-hidden />
      <h2 className="text-headline-md text-espresso">{title}</h2>
      <p className="max-w-sm text-body-md text-walnut">{message}</p>
    </div>
  );
}
