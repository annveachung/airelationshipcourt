"use server";

import { redirect } from "next/navigation";
import { errorKey, INVITE_CODE_PATTERN } from "@/lib/couples";
import { createClient } from "@/lib/supabase/server";

export async function createCouple() {
  const supabase = await createClient();

  const { error } = await supabase.rpc("create_couple");
  if (error) {
    console.error("create_couple failed:", error.message);
    redirect(`/couple/new?error=${errorKey(error.message)}`);
  }

  const { error: inviteError } = await supabase.rpc("create_invite");
  if (inviteError) {
    console.error("create_invite failed:", inviteError.message);
    redirect(`/couple/invite?error=${errorKey(inviteError.message)}`);
  }

  redirect("/couple/invite");
}

export async function refreshInvite() {
  const supabase = await createClient();
  const { error } = await supabase.rpc("create_invite");
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

  const supabase = await createClient();
  const { error } = await supabase.rpc("accept_invite", { invite_code: code });
  if (error) {
    console.error("accept_invite failed:", error.message);
    redirect(`/join/${code}?error=${errorKey(error.message)}`);
  }

  redirect("/");
}
