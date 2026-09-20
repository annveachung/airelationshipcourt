import { cookies, headers } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE, localeFromAcceptLanguage } from "@/lib/i18n";

// The language comes from a cookie (set by the globe menu), else the browser's
// language, else English. No language in the URL.
export default getRequestConfig(async () => {
  const cookieValue = (await cookies()).get(LOCALE_COOKIE)?.value;
  const locale = isLocale(cookieValue)
    ? cookieValue
    : localeFromAcceptLanguage((await headers()).get("accept-language")) || DEFAULT_LOCALE;

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
