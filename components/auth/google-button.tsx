"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/browser";

export function GoogleButton({ next }: { next: string }) {
  const t = useTranslations("login");
  const [busy, setBusy] = useState(false);

  async function signIn() {
    setBusy(true);
    // Remember where to go after signing in (10 minutes). Keeping it out of the redirect address
    // means Supabase's allowed-URL list only needs the plain ".../auth/callback" address.
    document.cookie = `auth_next=${encodeURIComponent(next)}; path=/; max-age=600; SameSite=Lax`;

    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  return (
    <Button onClick={signIn} disabled={busy} className="w-full">
      {busy ? t("googleBusy") : t("google")}
    </Button>
  );
}
