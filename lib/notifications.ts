// SERVER ONLY. Creates notifications. Uses the secret key, so it lives beside the other
// server-only modules that are allowed to (state-machine, pipeline, run).
//
// A notification stores a TYPE and a name — never a sentence and never testimony or AI text —
// so it can be shown in each person's language and chosen tone.
import "server-only";
import type { NotificationType } from "@/lib/notification-types";
import { createServiceClient } from "@/lib/supabase/service";

type NotifyInput = {
  userId: string;
  caseId?: string | null;
  type: NotificationType;
  params?: { name?: string };
};

/** Creates one notification. Never throws: a failed notification must not break the action. */
export async function notify({ userId, caseId = null, type, params = {} }: NotifyInput): Promise<void> {
  try {
    const { error } = await createServiceClient()
      .from("notifications")
      .insert({ user_id: userId, case_id: caseId, type, params });
    // 23505 = already sent (a retried step). That's fine.
    if (error && error.code !== "23505") console.error("notify failed:", type, error.code);
  } catch (error) {
    console.error("notify failed:", type, error instanceof Error ? error.name : "unknown");
  }
}

async function coupleMembers(userId: string) {
  const db = createServiceClient();
  const { data: mine } = await db.from("couple_members").select("couple_id").eq("user_id", userId).maybeSingle();
  if (!mine) return [];
  const { data } = await db.from("couple_members").select("user_id").eq("couple_id", mine.couple_id);
  return (data ?? []).map((m) => m.user_id as string);
}

async function displayName(userId: string): Promise<string | undefined> {
  const { data } = await createServiceClient().from("profiles").select("display_name").eq("id", userId).maybeSingle();
  return data?.display_name ?? undefined;
}

/** Tells the OTHER person in the actor's couple, naming the actor ("Sam submitted…"). */
export async function notifyPartner(actorId: string, caseId: string | null, type: NotificationType): Promise<void> {
  try {
    const [members, name] = await Promise.all([coupleMembers(actorId), displayName(actorId)]);
    for (const userId of members.filter((id) => id !== actorId)) {
      await notify({ userId, caseId, type, params: { name } });
    }
  } catch (error) {
    console.error("notifyPartner failed:", type, error instanceof Error ? error.name : "unknown");
  }
}

/** Tells both people in the case's couple (shared events like "the verdict is ready"). */
export async function notifyBoth(caseId: string, type: NotificationType): Promise<void> {
  try {
    const db = createServiceClient();
    const { data: theCase } = await db.from("cases").select("couple_id").eq("id", caseId).maybeSingle();
    if (!theCase) return;
    const { data: members } = await db.from("couple_members").select("user_id").eq("couple_id", theCase.couple_id);
    for (const m of members ?? []) await notify({ userId: m.user_id as string, caseId, type });
  } catch (error) {
    console.error("notifyBoth failed:", type, error instanceof Error ? error.name : "unknown");
  }
}
