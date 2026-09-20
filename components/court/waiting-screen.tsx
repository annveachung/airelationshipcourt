"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Hourglass } from "lucide-react";

type Status = { stage: string; aSubmitted: boolean; bSubmitted: boolean };

// Polls a tiny status endpoint every few seconds and refreshes the page when
// something changes. Pauses while the tab is hidden.
export function WaitingScreen({
  caseId,
  initial,
  title,
  message,
}: {
  caseId: string;
  initial: Status;
  title: string;
  message: string;
}) {
  const router = useRouter();
  const last = useRef(initial);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      if (document.visibilityState !== "visible") return;
      try {
        const res = await fetch(`/api/cases/${caseId}/status`, { cache: "no-store" });
        if (!res.ok || cancelled) return;
        const next: Status = await res.json();
        const prev = last.current;
        if (
          next.stage !== prev.stage ||
          next.aSubmitted !== prev.aSubmitted ||
          next.bSubmitted !== prev.bSubmitted
        ) {
          last.current = next;
          router.refresh();
        }
      } catch {
        // Network blip: try again on the next tick.
      }
    }

    const id = setInterval(check, 3000);
    document.addEventListener("visibilitychange", check);
    return () => {
      cancelled = true;
      clearInterval(id);
      document.removeEventListener("visibilitychange", check);
    };
  }, [caseId, router]);

  return (
    <div role="status" className="flex flex-col items-center gap-3 py-6 text-center">
      <Hourglass size={32} className="text-walnut" aria-hidden />
      <h2 className="text-headline-md text-espresso">{title}</h2>
      <p className="max-w-sm text-body-md text-walnut">{message}</p>
    </div>
  );
}
