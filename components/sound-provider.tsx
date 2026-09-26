"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { playSound, type SoundKind } from "@/lib/sound";

const STORAGE_KEY = "sound-enabled";

type Value = { enabled: boolean; setEnabled: (enabled: boolean) => void; play: (kind: SoundKind) => void };

const SoundContext = createContext<Value | null>(null);

/** Returns null if no provider is mounted (SSR, or an edge case) — callers degrade silently. */
export function useSound(): Value | null {
  return useContext(SoundContext);
}

// Off by default (matches the decision to keep the app quiet for a couple mid-argument), and
// remembered per device — not part of the account, since it's a browser preference.
export function SoundProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabledState] = useState(false);

  // Read the saved preference once, after mount (avoids a server/client mismatch — the server
  // has no localStorage to read from).
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY) === "true";
      // One-time sync from an external system (localStorage) the server can't see —
      // deliberately not derivable during render, so the lint rule doesn't apply here.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (saved) setEnabledState(true);
    } catch {
      // Storage blocked (private mode, etc.): stay at the silent default.
    }
  }, []);

  const setEnabled = useCallback((next: boolean) => {
    setEnabledState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, String(next));
    } catch {
      // Storage blocked: the preference just won't survive a reload.
    }
  }, []);

  const play = useCallback(
    (kind: SoundKind) => {
      if (enabled) playSound(kind);
    },
    [enabled],
  );

  const value = useMemo(() => ({ enabled, setEnabled, play }), [enabled, setEnabled, play]);
  return <SoundContext.Provider value={value}>{children}</SoundContext.Provider>;
}
