"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};
const origin = () => window.location.origin;
const serverOrigin = () => "";

// DEVELOPMENT ONLY (never shown in production builds, so not translated).
// When you open the dev server from another device, Supabase only signs you in if this exact
// address is on its "Redirect URLs" list. This shows what to add.
export function DevOriginHint() {
  const here = useSyncExternalStore(subscribe, origin, serverOrigin);
  if (process.env.NODE_ENV !== "development" || !here) return null;
  const host = new URL(here).hostname;
  if (host === "localhost" || host === "127.0.0.1") return null;

  return (
    <div className="rounded-card border border-rose-deep/40 bg-rose/20 p-4 text-body-sm text-ink">
      <p className="font-medium text-espresso">Developer tip</p>
      <p className="mt-1">
        This device is using <code className="break-all font-mono">{here}</code>. For Google sign-in to come back
        here, add this line to Supabase → Authentication → URL Configuration → Redirect URLs, then Save:
      </p>
      <p className="mt-2 break-all rounded bg-surface px-2 py-1 font-mono text-body-sm">{`${here}/**`}</p>
    </div>
  );
}
