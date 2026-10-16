"use server";

import { createClient } from "@/lib/db/server";

// Saves whether this person wants playful or plain notification wording.
export async function setNotificationStyle(playful: boolean) {
  const db = await createClient();
  const { error } = await db.rpc("set_my_notification_style", { playful: Boolean(playful) });
  if (error) console.error("set_my_notification_style failed:", error.message);
}
