"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { signInWithGoogle } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";

export function GoogleButton({ next }: { next: string }) {
  const t = useTranslations("login");
  const [busy, setBusy] = useState(false);

  async function signIn() {
    setBusy(true);
    try {
      await signInWithGoogle(next); // redirects to Google
    } catch (error) {
      setBusy(false);
      throw error;
    }
  }

  return (
    <Button onClick={signIn} disabled={busy} className="w-full">
      {busy ? t("googleBusy") : t("google")}
    </Button>
  );
}
