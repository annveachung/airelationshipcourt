"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Check, Globe } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { setLocale } from "@/app/i18n/actions";
import { cn } from "@/lib/cn";
import { LOCALE_LABELS, LOCALES, type Locale } from "@/lib/i18n";

// The small globe in the header: pick English or 繁體中文.
export function LanguageMenu() {
  const t = useTranslations("languageMenu");
  const current = useLocale() as Locale;
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);

  // Close on outside click or Escape (and hand focus back to the button).
  useEffect(() => {
    if (!open) return;
    function onPointer(e: PointerEvent) {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        button.current?.focus();
      }
    }
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function choose(locale: Locale) {
    setOpen(false);
    if (locale !== current) startTransition(() => setLocale(locale));
  }

  return (
    <div ref={root} className="relative">
      <button
        ref={button}
        type="button"
        aria-label={t("button")}
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={pending}
        onClick={() => setOpen((o) => !o)}
        className="flex size-11 items-center justify-center rounded-full text-espresso hover:bg-rose/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-espresso disabled:opacity-50 md:size-9"
      >
        <Globe size={20} aria-hidden />
      </button>

      {open && (
        <ul
          role="menu"
          className="absolute right-0 top-full z-30 mt-2 min-w-40 overflow-hidden rounded-card border border-hairline bg-surface py-1 shadow-float"
        >
          {LOCALES.map((locale) => (
            <li key={locale} role="none">
              <button
                type="button"
                role="menuitemradio"
                aria-checked={locale === current}
                lang={locale}
                onClick={() => choose(locale)}
                className={cn(
                  "flex min-h-11 w-full items-center justify-between gap-3 px-4 text-left text-body-md text-espresso hover:bg-rose/30",
                  "focus-visible:bg-rose/30 focus-visible:outline-none",
                )}
              >
                {LOCALE_LABELS[locale]}
                {locale === current && <Check size={16} aria-hidden />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
