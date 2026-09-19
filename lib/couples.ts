import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export type Partner = {
  userId: string;
  role: "partner_a" | "partner_b";
  name: string;
  avatarUrl: string | null;
};

export type CoupleState =
  | { kind: "none" }
  | { kind: "pending"; coupleId: string; me: Partner }
  | { kind: "active"; coupleId: string; me: Partner; partner: Partner };

type MemberRow = {
  user_id: string;
  role: "partner_a" | "partner_b";
  couple_id: string;
  profiles: { display_name: string; avatar_url: string | null } | null;
};

export async function getMyCouple(userId: string): Promise<CoupleState> {
  const supabase = await createClient();

  const { data: mine } = await supabase
    .from("couple_members")
    .select("couple_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (!mine) return { kind: "none" };

  // Row Level Security lets us read both members of our own couple.
  const { data } = await supabase
    .from("couple_members")
    .select("user_id, role, couple_id, profiles(display_name, avatar_url)")
    .eq("couple_id", mine.couple_id)
    .returns<MemberRow[]>();

  const partners: Partner[] = (data ?? []).map((row) => ({
    userId: row.user_id,
    role: row.role,
    name: row.profiles?.display_name ?? "Unnamed",
    avatarUrl: row.profiles?.avatar_url ?? null,
  }));

  const me = partners.find((p) => p.userId === userId);
  if (!me) return { kind: "none" };
  const partner = partners.find((p) => p.userId !== userId);

  return partner
    ? { kind: "active", coupleId: mine.couple_id, me, partner }
    : { kind: "pending", coupleId: mine.couple_id, me };
}

// Builds an absolute invite link from the incoming request's host.
export async function inviteLink(code: string): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}/join/${code}`;
}

// 22-character base64url, matching what create_invite() generates.
export const INVITE_CODE_PATTERN = /^[A-Za-z0-9_-]{22}$/;

export const INVITE_ERRORS: Record<string, string> = {
  invite_invalid: "That invite link doesn't look right.",
  invite_used: "That invite has already been used.",
  invite_expired: "That invite has expired. Ask your partner for a new one.",
  invite_own: "You can't join your own invite — send it to your partner.",
  already_in_couple: "You're already part of a couple.",
  no_pending_couple: "You don't have a couple waiting for a partner.",
};

// Maps a database error message to a known error key (passed in the URL, never raw text).
export function errorKey(message: string | undefined): string {
  return Object.keys(INVITE_ERRORS).find((k) => message?.includes(k)) ?? "unknown";
}

// Turns an error key from the URL into user-facing text. Unknown keys get a generic message.
export function friendlyError(key: string | string[] | undefined): string | null {
  if (!key) return null;
  const k = Array.isArray(key) ? key[0] : key;
  return INVITE_ERRORS[k] ?? "Something went wrong. Please try again.";
}
