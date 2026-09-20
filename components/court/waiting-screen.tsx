"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Hourglass, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

type Status = {
  stage: string;
  aSubmitted: boolean;
  bSubmitted: boolean;
  aFollowedUp: boolean;
  bFollowedUp: boolean;
  failed: boolean;
};

// Polls a tiny status endpoint every few seconds and refreshes the page when
// something changes. Pauses while the tab is hidden. With `drive`, it also asks the
// server to run the next AI step (both partners may do this; the server allows one run).
export function WaitingScreen({
  caseId,
  initial,
  title,
  message,
  drive = false,
  errorMessage = null,
}: {
  caseId: string;
  initial: Status;
  title: string;
  message: string;
  drive?: boolean;
  errorMessage?: string | null;
}) {
  const router = useRouter();
  const last = useRef(initial);
  const busy = useRef(false);
  const [retrying, setRetrying] = useState(false);

  const advance = useCallback(
    async (retry = false) => {
      if (busy.current) return;
      busy.current = true;
      try {
        await fetch(`/api/cases/${caseId}/advance`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ retry }),
        });
      } catch {
        // The next poll will pick up whatever state the server ended in.
      } finally {
        busy.current = false;
        router.refresh();
      }
    },
    [caseId, router],
  );

  useEffect(() => {
    let cancelled = false;
    // Kick off the AI step right away (a no-op if it's already running or failed).
    if (drive && !initial.failed) void advance();

    async function check() {
      if (document.visibilityState !== "visible") return;
      try {
        const res = await fetch(`/api/cases/${caseId}/status`, { cache: "no-store" });
        if (!res.ok || cancelled) return;
        const next: Status = await res.json();
        const prev = last.current;
        const changed = (Object.keys(next) as (keyof Status)[]).some((k) => next[k] !== prev[k]);
        last.current = next;
        if (changed) {
          router.refresh();
        } else if (drive && next.stage === "ANALYSIS" && !next.failed) {
          void advance();
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
  }, [caseId, router, drive, advance, initial.failed]);

  if (errorMessage) {
    return (
      <div role="alert" className="flex flex-col items-center gap-3 py-6 text-center">
        <TriangleAlert size={32} className="text-error" aria-hidden />
        <h2 className="text-headline-md text-espresso">The court hit a snag</h2>
        <p className="max-w-sm text-body-md text-walnut">{errorMessage}</p>
        {drive && (
          <Button
            disabled={retrying}
            onClick={async () => {
              setRetrying(true);
              await advance(true);
              setRetrying(false);
            }}
          >
            {retrying ? "Trying again…" : "Try again"}
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
