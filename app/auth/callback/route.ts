import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { safeNext } from "@/lib/auth";
import { isLocale, LOCALE_COOKIE } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/server";

function decodeCookie(value: string | undefined): string | null {
  if (!value) return null;
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}

// A redirect with a RELATIVE address ("/login"), so the browser stays on whatever address it
// used (localhost, your computer's Wi-Fi address on a phone, or the deployed site). Building
// an absolute address from the server's own idea of its origin sends phones to "localhost".
function redirectTo(path: string) {
  return new NextResponse(null, { status: 307, headers: { Location: path } });
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const cookieStore = await cookies();
  const code = searchParams.get("code");
  // Where to go afterwards: the cookie set just before signing in (or an older ?next= link).
  const next = safeNext(searchParams.get("next") ?? decodeCookie(cookieStore.get("auth_next")?.value));
  cookieStore.delete("auth_next");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      await syncLanguage(supabase);
      return redirectTo(next);
    }
  }
  return redirectTo("/login?error=signin_failed");
}

// A language picked on this device wins and is saved to the profile; on a device with no
// choice yet, the saved profile language is applied instead.
async function syncLanguage(supabase: Awaited<ReturnType<typeof createClient>>) {
  const cookieStore = await cookies();
  const chosen = cookieStore.get(LOCALE_COOKIE)?.value;

  if (isLocale(chosen)) {
    await supabase.rpc("set_my_locale", { new_locale: chosen });
    return;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  const { data: profile } = await supabase.from("profiles").select("locale").eq("id", user.id).maybeSingle();
  if (isLocale(profile?.locale)) {
    cookieStore.set(LOCALE_COOKIE, profile.locale, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  }
}
