"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { isLocale, LOCALE_COOKIE } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/server";

export async function setLocale(locale: string) {
  if (!isLocale(locale)) return;

  (await cookies()).set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });

  // Signed in? Remember it on the profile too, so AI text for this person is in their language.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    const { error } = await supabase.rpc("set_my_locale", { new_locale: locale });
    if (error) console.error("set_my_locale failed:", error.message);
  }

  revalidatePath("/", "layout");
}
