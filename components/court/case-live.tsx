"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { CourtStatus } from "@/lib/cases/court-status";

type Value = { status: CourtStatus; retry: () => Promise<void>; retrying: boolean };

const CaseLiveContext = createContext<Value | null>(null);

export function useCaseLive(): Value {
  const value = useContext(CaseLiveContext);
  if (!value) throw new Error("useCaseLive must be used inside <CaseLive>");
  return value;
}

// Stages where the server does AI work that this page should keep nudging along.
const DRIVEN_STAGES = ["ANALYSIS", "PANEL_JUDGEMENT"];
const POLL_MS = 3000;

// ONE poller per case page. It keeps the current status for the waiting screens and the Court
// Status panel, refreshes the page when something changes, and drives the AI pipeline
// (both partners may do this; the server lets only one run happen).
export function CaseLive({
  caseId,
  initial,
  children,
}: {
  caseId: string;
  initial: CourtStatus;
  children: ReactNode;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(initial);
  const [retrying, setRetrying] = useState(false);
  const last = useRef(initial);
  const busy = useRef(false);

  // The server re-rendered with newer data: adopt it (adjusting state while rendering, not in an effect).
  const initialKey = JSON.stringify(initial);
  const [seededFrom, setSeededFrom] = useState(initialKey);
  if (seededFrom !== initialKey) {
    setSeededFrom(initialKey);
    setStatus(initial);
  }
  useEffect(() => {
    last.current = status;
  }, [status]);

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
    if (DRIVEN_STAGES.includes(initial.stage) && !initial.failed) void advance();

    async function check() {
      if (document.visibilityState !== "visible") return;
      if (last.current.stage === "CLOSED") return; // nothing left to wait for
      try {
        const res = await fetch(`/api/cases/${caseId}/status`, { cache: "no-store" });
        if (!res.ok || cancelled) return;
        const next: CourtStatus = await res.json();
        const changed = JSON.stringify(next) !== JSON.stringify(last.current);
        last.current = next;
        if (changed) {
          setStatus(next);
          router.refresh();
        } else if (DRIVEN_STAGES.includes(next.stage) && !next.failed) {
          void advance();
        }
      } catch {
        // Network blip: try again on the next tick.
      }
    }

    const id = setInterval(check, POLL_MS);
    document.addEventListener("visibilitychange", check);
    return () => {
      cancelled = true;
      clearInterval(id);
      document.removeEventListener("visibilitychange", check);
    };
    // Only (re)start when the case changes; the poll itself reads fresh data.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId, advance, router]);

  const retry = useCallback(async () => {
    setRetrying(true);
    await advance(true);
    setRetrying(false);
  }, [advance]);

  const value = useMemo(() => ({ status, retry, retrying }), [status, retry, retrying]);
  return <CaseLiveContext.Provider value={value}>{children}</CaseLiveContext.Provider>;
}
