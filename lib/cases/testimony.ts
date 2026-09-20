import { z } from "zod";

// Feelings, causes and needs are quick-pick chips. They're stored as plain text arrays,
// so the lists can grow without a database change (validated here, in code).
export const EMOTIONS = [
  "Angry",
  "Hurt",
  "Sad",
  "Ignored",
  "Disrespected",
  "Unappreciated",
  "Misunderstood",
  "Frustrated",
  "Disappointed",
  "Anxious",
  "Overwhelmed",
  "Lonely",
  "Betrayed",
  "Jealous",
  "Insecure",
  "Embarrassed",
  "Guilty",
  "Confused",
  "Numb",
  "Other",
] as const;

export const CAUSES = [
  "Communication",
  "Expectations",
  "Assumptions",
  "Trust",
  "Stress or tiredness",
  "Time and priorities",
  "Chores or money",
  "Family or friends",
  "Other",
] as const;

export const NEEDS = [
  "An apology",
  "To be listened to",
  "A change in behaviour",
  "Reassurance",
  "Appreciation",
  "Space",
  "Help",
  "An explanation",
  "Other",
] as const;

export const FREQUENCIES = [
  { value: "first_time", label: "First time" },
  { value: "sometimes", label: "Sometimes" },
  { value: "often", label: "Often" },
] as const;

export const LIMITS = {
  title: 120,
  context: 500,
  story: 2000,
  wrong: 1000,
  note: 300,
} as const;

const text = (max: number) =>
  z
    .string()
    .trim()
    .min(1, "required")
    .max(max, "too_long");

const optionalNote = z.string().trim().max(LIMITS.note, "too_long").optional();

// The title is generated from the context, so the context is what the user writes.
export const caseSchema = z.object({
  context: z.string().trim().min(10, "too_short").max(LIMITS.context, "too_long"),
});

export const testimonySchema = z.object({
  caseId: z.uuid(),
  whatHappened: text(LIMITS.story),
  emotions: z.array(z.enum(EMOTIONS)).min(1, "required"),
  severity: z.coerce.number().int().min(1).max(10),
  causes: z.array(z.enum(CAUSES)).min(1, "required"),
  causeNote: optionalNote,
  needs: z.array(z.enum(NEEDS)).min(1, "required"),
  needsNote: optionalNote,
  frequency: z.enum(["first_time", "sometimes", "often"]),
  partnerDidWrong: text(LIMITS.wrong),
});

export const CASE_ERRORS: Record<string, string> = {
  case_already_open: "Your couple already has an open case. Finish it before filing another.",
  no_active_couple: "You need a couple with both partners before filing a case.",
  already_testified: "You've already given your testimony for this case.",
  not_allowed: "You can't submit testimony for this case right now.",
  already_answered: "You've already answered the follow-up questions for this case.",
  invalid: "Please check your answers — some fields are missing, too short or too long.",
};

export function caseError(key: string | string[] | undefined): string | null {
  if (!key) return null;
  const k = Array.isArray(key) ? key[0] : key;
  return CASE_ERRORS[k] ?? "Something went wrong. Please try again.";
}
