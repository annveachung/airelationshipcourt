import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { safeNext } from "@/lib/auth";
import { createClient } from "@/lib/db/server";
import { isLocale, LOCALE_COOKIE } from "@/lib/i18n";
import { getUser } from "@/lib/session";

// A redirect with a RELATIVE address ("/login"), so the browser stays on whatever address it
// used (localhost, your computer's Wi-Fi address on a phone, or the deployed site). Building
// an absolute address from the server's own idea of its origin sends phones to "localhost".
function redirectTo(path: string) {
  return new NextResponse(null, { status: 307, headers: { Location: path } });
}

// Auth.js finishes the Google sign-in at /api/auth/callback/google and then sends the person
// here, so their language can be synced before they continue to `next`.
export async function GET(request: NextRequest) {
  const next = safeNext(request.nextUrl.searchParams.get("next"));
  const user = await getUser();
  if (!user) return redirectTo("/login?error=signin_failed");

  await syncLanguage(user.id);
  return redirectTo(next);
}

// A language picked on this device wins and is saved to the profile; on a device with no
// choice yet, the saved profile language is applied instead.
async function syncLanguage(userId: string) {
  const cookieStore = await cookies();
  const chosen = cookieStore.get(LOCALE_COOKIE)?.value;
  const db = await createClient();

  if (isLocale(chosen)) {
    await db.rpc("set_my_locale", { new_locale: chosen });
    return;
  }

  const { data: profile } = await db.from("profiles").select("locale").eq("id", userId).maybeSingle();
  if (isLocale(profile?.locale)) {
    cookieStore.set(LOCALE_COOKIE, profile.locale, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  }
}
