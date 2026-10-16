"use server";

import { redirect } from "next/navigation";
import { errorKey, INVITE_CODE_PATTERN } from "@/lib/couples";
import { notifyPartner } from "@/lib/notifications";
import { createClient } from "@/lib/db/server";
import { getUser } from "@/lib/session";

export async function createCouple() {
  const db = await createClient();

  const { error } = await db.rpc("create_couple");
  if (error) {
    console.error("create_couple failed:", error.message);
    redirect(`/couple/new?error=${errorKey(error.message)}`);
  }

  const { error: inviteError } = await db.rpc("create_invite");
  if (inviteError) {
    console.error("create_invite failed:", inviteError.message);
    redirect(`/couple/invite?error=${errorKey(inviteError.message)}`);
  }

  redirect("/couple/invite");
}

export async function refreshInvite() {
  const db = await createClient();
  const { error } = await db.rpc("create_invite");
  if (error) {
    console.error("create_invite failed:", error.message);
    redirect(`/couple/invite?error=${errorKey(error.message)}`);
  }
  redirect("/couple/invite");
}

export async function acceptInvite(formData: FormData) {
  const code = String(formData.get("code") ?? "");
  if (!INVITE_CODE_PATTERN.test(code)) {
    redirect("/");
  }

  const db = await createClient();
  const user = await getUser();
  const { error } = await db.rpc("accept_invite", { invite_code: code });
  if (error) {
    console.error("accept_invite failed:", error.message);
    redirect(`/join/${code}?error=${errorKey(error.message)}`);
  }

  // Tell the person who invited them that the partner has arrived.
  if (user) await notifyPartner(user.id, null, "partner_joined");

  redirect("/");
}
