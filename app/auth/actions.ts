"use server";

import { safeNext } from "@/lib/auth";
import { signIn, signOut as endSession } from "@/lib/session";

// Google sends the person back to /auth/callback, which applies their saved language and then
// continues to `next`.
export async function signInWithGoogle(next: string) {
  await signIn("google", { redirectTo: `/auth/callback?next=${encodeURIComponent(safeNext(next))}` });
}

export async function signOut() {
  await endSession({ redirectTo: "/login" });
}
