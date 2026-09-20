"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import type { Locale } from "@/lib/i18n";

// The case report is written in the background while partners read the verdict. If the
// English report or this viewer's translation is missing, ask the server to prepare it once
// and refresh when it's done. `showNote` only says "preparing" where the report is needed.
export function ReportPreparer({
  caseId,
  locale,
  showNote = false,
}: {
  caseId: string;
  locale: Locale;
  showNote?: boolean;
}) {
  const t = useTranslations("report");
  const router = useRouter();
  const started = useRef(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    let attempts = 0;

    async function prepare() {
      attempts++;
      try {
        const res = await fetch(`/api/cases/${caseId}/report`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ locale }),
        });
        const body = (await res.json()) as { status?: string };
        if (body.status === "ok") router.refresh();
        else if (body.status === "in_progress" && attempts < 15) setTimeout(prepare, 4000);
        else setFailed(true);
      } catch {
        setFailed(true);
      }
    }
    void prepare();
  }, [caseId, locale, router]);

  if (!showNote) return null;
  return (
    <p role="status" className="text-body-sm text-walnut print:hidden">
      {failed ? t("prepareFailed") : t("preparing")}
    </p>
  );
}
