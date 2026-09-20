"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import type { Locale } from "@/lib/i18n";

// Shown when the verdict exists but hasn't been translated into the viewer's language yet.
// Asks the server to translate it once, then refreshes; meanwhile the English text shows.
export function TranslationGate({ caseId, locale }: { caseId: string; locale: Locale }) {
  const t = useTranslations("verdict");
  const router = useRouter();
  const started = useRef(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    (async () => {
      try {
        const res = await fetch(`/api/cases/${caseId}/translate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ locale }),
        });
        const body = (await res.json()) as { status?: string };
        if (body.status === "ok") router.refresh();
        else if (body.status === "in_progress") setTimeout(() => router.refresh(), 4000);
        else setFailed(true);
      } catch {
        setFailed(true);
      }
    })();
  }, [caseId, locale, router]);

  return (
    <p role="status" className="rounded-card border border-hairline bg-surface px-4 py-3 text-body-sm text-walnut">
      {failed ? t("translationFailed") : t("translating")}
    </p>
  );
}
