"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};
const origin = () => window.location.origin;
const serverOrigin = () => "";

// DEVELOPMENT ONLY (never shown in production builds, so not translated).
// When you open the dev server from another device, Google sign-in can't come back to it: an
// OAuth client only accepts localhost or a public domain as a redirect address. This says so.
export function DevOriginHint() {
  const here = useSyncExternalStore(subscribe, origin, serverOrigin);
  if (process.env.NODE_ENV !== "development" || !here) return null;
  const host = new URL(here).hostname;
  if (host === "localhost" || host === "127.0.0.1") return null;

  return (
    <div className="rounded-card border border-rose-deep/40 bg-rose/20 p-4 text-body-sm text-ink">
      <p className="font-medium text-espresso">Developer tip</p>
      <p className="mt-1">
        This device is using <code className="break-all font-mono">{here}</code>. Google sign-in only
        returns to <code className="font-mono">localhost</code> or a public domain, so sign in on the computer running
        the dev server, or test phones on the deployed site.
      </p>
    </div>
  );
}
