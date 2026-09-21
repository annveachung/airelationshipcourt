"use client";

import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { useNotifications, type NotificationItem } from "@/components/notifications-provider";
import { cn } from "@/lib/cn";
import { notificationHref } from "@/lib/notification-types";
import { relativeTime } from "@/lib/relative-time";

// The bell in the header: unread badge, latest notifications, and the playful/plain switch.
export function NotificationBell() {
  const t = useTranslations("notifications");
  const locale = useLocale();
  const ctx = useNotifications();
  const [open, setOpen] = useState(false);
  const [freshIds, setFreshIds] = useState<string[]>([]);
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

  if (!ctx) return null;
  const { items, unread, playful, markRead, setPlayful } = ctx;
  const style = playful ? "playful" : "plain";

  function toggle() {
    const opening = !open;
    setOpen(opening);
    if (opening) {
      // Remember which ones were new (to highlight them), then mark them read.
      const ids = items.filter((n) => !n.read).map((n) => n.id);
      setFreshIds(ids);
      if (ids.length > 0) markRead(ids);
    }
  }

  const line = (n: NotificationItem) =>
    t(`${style}.${n.type}`, { name: n.params.name ?? t("partnerFallback") });

  return (
    <div ref={root} className="relative">
      <button
        ref={button}
        type="button"
        aria-label={unread > 0 ? `${t("open")} (${t("unread", { count: unread })})` : t("open")}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={toggle}
        className="relative flex size-11 items-center justify-center rounded-full text-espresso hover:bg-rose/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-espresso md:size-9"
      >
        <Bell size={20} aria-hidden />
        {unread > 0 && (
          <span
            aria-hidden
            className="absolute right-1 top-1 flex min-w-4 items-center justify-center rounded-full bg-rose-deep px-1 text-[10px] font-semibold leading-4 text-canvas"
          >
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-30 mt-2 flex w-[min(20rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-card border border-hairline bg-surface shadow-float"
        >
          <div className="flex items-center justify-between gap-3 border-b border-hairline px-4 py-3">
            <span className="text-headline-sm text-espresso">{t("title")}</span>
            <label className="flex cursor-pointer items-center gap-2 text-body-sm text-walnut">
              {t("playfulLabel")}
              <button
                type="button"
                role="switch"
                aria-checked={playful}
                aria-label={t("playfulLabel")}
                onClick={() => setPlayful(!playful)}
                className={cn(
                  "relative h-6 w-10 rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-espresso",
                  playful ? "bg-espresso" : "bg-recessed",
                )}
              >
                <span
                  className={cn(
                    "absolute top-0.5 size-5 rounded-full bg-surface shadow transition-all",
                    playful ? "left-[1.125rem]" : "left-0.5",
                  )}
                />
              </button>
            </label>
          </div>

          {items.length === 0 ? (
            <p className="px-4 py-6 text-center text-body-sm text-walnut">{t("empty")}</p>
          ) : (
            <ul className="max-h-80 overflow-y-auto">
              {items.map((n) => (
                <li key={n.id} role="none">
                  <Link
                    href={notificationHref(n.caseId)}
                    role="menuitem"
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex min-h-14 flex-col gap-0.5 border-b border-hairline px-4 py-3 last:border-b-0 hover:bg-rose/20 focus-visible:bg-rose/20 focus-visible:outline-none",
                      (!n.read || freshIds.includes(n.id)) && "bg-rose/10",
                    )}
                  >
                    <span className="break-words text-body-md text-ink">{line(n)}</span>
                    <span className="text-body-sm text-walnut">{relativeTime(n.createdAt, locale, t("justNow"))}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
