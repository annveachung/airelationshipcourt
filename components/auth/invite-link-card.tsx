"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

export function InviteLinkCard({ link }: { link: string }) {
  const t = useTranslations("couple.invite");
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked: the link is selectable in the box above.
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <input
        readOnly
        value={link}
        aria-label={t("linkLabel")}
        onFocus={(e) => e.currentTarget.select()}
        className="w-full rounded-field border border-hairline-strong bg-surface px-3.5 py-3 text-body-sm text-espresso"
      />
      <Button variant="secondary" onClick={copy}>
        {copied ? <Check size={16} /> : <Copy size={16} />}
        {copied ? t("copied") : t("copy")}
      </Button>
    </div>
  );
}
