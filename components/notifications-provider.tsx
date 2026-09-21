"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { setNotificationStyle } from "@/app/notifications/actions";
import type { NotificationType } from "@/lib/notification-types";

export type NotificationItem = {
  id: string;
  type: NotificationType;
  caseId: string | null;
  params: { name?: string };
  createdAt: string;
  read: boolean;
};

type Value = {
  items: NotificationItem[];
  unread: number;
  playful: boolean;
  markRead: (ids: string[] | "all") => void;
  setPlayful: (playful: boolean) => void;
};

const NotificationsContext = createContext<Value | null>(null);

/** Null when the person isn't signed in (no provider is mounted). */
export function useNotifications() {
  return useContext(NotificationsContext);
}

const POLL_MS = 15_000;

// ONE notification poller for the whole page, shared by the bell and the Court Status panel.
export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [playful, setPlayfulState] = useState(true);
  const inFlight = useRef(false);

  const load = useCallback(async () => {
    if (document.visibilityState !== "visible" || inFlight.current) return;
    inFlight.current = true;
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { items: NotificationItem[]; unread: number; playful: boolean };
      setItems(data.items);
      setUnread(data.unread);
      setPlayfulState(data.playful);
    } catch {
      // Network blip: the next tick will try again.
    } finally {
      inFlight.current = false;
    }
  }, []);

  useEffect(() => {
    const first = setTimeout(load, 0);
    const id = setInterval(load, POLL_MS);
    document.addEventListener("visibilitychange", load);
    return () => {
      clearTimeout(first);
      clearInterval(id);
      document.removeEventListener("visibilitychange", load);
    };
  }, [load]);

  const markRead = useCallback((ids: string[] | "all") => {
    // Update the screen straight away, then tell the server.
    setItems((current) => current.map((n) => (ids === "all" || ids.includes(n.id) ? { ...n, read: true } : n)));
    setUnread((current) => (ids === "all" ? 0 : Math.max(0, current - ids.length)));
    void fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ read: ids }),
    });
  }, []);

  const setPlayful = useCallback((next: boolean) => {
    setPlayfulState(next);
    void setNotificationStyle(next);
  }, []);

  const value = useMemo(
    () => ({ items, unread, playful, markRead, setPlayful }),
    [items, unread, playful, markRead, setPlayful],
  );
  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}
