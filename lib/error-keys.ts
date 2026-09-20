// Errors travel through URLs and the database as short KEYS, never as sentences.
// The screen turns a key into text in the viewer's language (messages/*.json).

export const CASE_ERROR_KEYS = [
  "case_already_open",
  "no_active_couple",
  "already_testified",
  "not_allowed",
  "already_answered",
  "already_signed",
  "report_not_ready",
  "invalid",
  "unknown",
] as const;
export type CaseErrorKey = (typeof CASE_ERROR_KEYS)[number];

export const INVITE_ERROR_KEYS = [
  "invite_invalid",
  "invite_used",
  "invite_expired",
  "invite_own",
  "already_in_couple",
  "no_pending_couple",
  "unknown",
] as const;
export type InviteErrorKey = (typeof INVITE_ERROR_KEYS)[number];

export const AI_ERROR_KEYS = ["invalid_output", "unavailable", "not_configured"] as const;
export type AiErrorKey = (typeof AI_ERROR_KEYS)[number];

function first(value: string | string[] | undefined | null): string | undefined {
  return Array.isArray(value) ? value[0] : (value ?? undefined);
}

export function toCaseErrorKey(value: string | string[] | undefined): CaseErrorKey | null {
  const v = first(value);
  if (!v) return null;
  return (CASE_ERROR_KEYS as readonly string[]).includes(v) ? (v as CaseErrorKey) : "unknown";
}

export function toInviteErrorKey(value: string | string[] | undefined): InviteErrorKey | null {
  const v = first(value);
  if (!v) return null;
  return (INVITE_ERROR_KEYS as readonly string[]).includes(v) ? (v as InviteErrorKey) : "unknown";
}

// `cases.last_error` used to hold an English sentence; anything that isn't a known key
// (old rows) is shown as a generic "unavailable" message.
export function toAiErrorKey(value: string | null | undefined): AiErrorKey | null {
  if (!value) return null;
  return (AI_ERROR_KEYS as readonly string[]).includes(value) ? (value as AiErrorKey) : "unavailable";
}
