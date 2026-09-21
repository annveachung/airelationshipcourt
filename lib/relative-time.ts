// Pure and unit-tested: "5 minutes ago" / "5 分鐘前" in the viewer's language.

export function relativeTime(iso: string, locale: string, justNow: string, now = Date.now()): string {
  const seconds = Math.round((new Date(iso).getTime() - now) / 1000); // negative = in the past
  const abs = Math.abs(seconds);
  if (abs < 60) return justNow;

  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  if (abs < 3600) return rtf.format(Math.round(seconds / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(seconds / 3600), "hour");
  if (abs < 86400 * 30) return rtf.format(Math.round(seconds / 86400), "day");
  return new Date(iso).toLocaleDateString(locale);
}
