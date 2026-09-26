"use client";

import { Volume2, VolumeX } from "lucide-react";
import { useTranslations } from "next-intl";
import { useSound } from "@/components/sound-provider";

// The speaker icon in the header. Sound is off by default; turning it on plays an immediate
// click so the switch itself is the confirmation.
export function SoundToggle() {
  const t = useTranslations("shell");
  const sound = useSound();
  if (!sound) return null;
  const { enabled, setEnabled, play } = sound;

  function toggle() {
    const next = !enabled;
    setEnabled(next);
    if (next) play("click");
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={enabled}
      aria-label={enabled ? t("soundOff") : t("soundOn")}
      className="flex size-11 items-center justify-center rounded-full text-espresso hover:bg-rose/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-espresso md:size-9"
    >
      {enabled ? <Volume2 size={20} aria-hidden /> : <VolumeX size={20} aria-hidden />}
    </button>
  );
}
