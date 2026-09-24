// Safe to import anywhere (no server-only code).

export const NOTIFICATION_TYPES = [
  "partner_joined",
  "case_filed",
  "partner_testified",
  "analysis_ready",
  "partner_followed_up",
  "verdict_ready",
  "partner_signed",
  "case_closed",
  "case_adjourned",
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export function isNotificationType(value: unknown): value is NotificationType {
  return typeof value === "string" && (NOTIFICATION_TYPES as readonly string[]).includes(value);
}

// Where a notification takes you when clicked.
export function notificationHref(caseId: string | null): string {
  return caseId ? `/cases/${caseId}` : "/";
}
