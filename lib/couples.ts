import { headers } from "next/headers";
import { INVITE_ERROR_KEYS } from "@/lib/error-keys";
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

// Maps a database error message to a known error key (passed in the URL, never raw text).
export function errorKey(message: string | undefined): string {
  return INVITE_ERROR_KEYS.find((k) => k !== "unknown" && message?.includes(k)) ?? "unknown";
}
