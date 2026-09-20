// The fixed list of "charges" the AI may pick from. Display names are translated in
// messages/*.json under `charges.<id>` — no AI needed to translate them.

export const CHARGE_IDS = [
  "assumption_of_intent",
  "excessive_fine",
  "poor_communication",
  "defensive_response",
  "failure_to_clarify_expectations",
  "unnecessary_escalation",
  "you_should_have_known",
  "bringing_up_2023",
  "silent_treatment",
  "score_keeping",
  "mind_reading",
  "selective_hearing",
  "phone_at_dinner",
  "dramatic_sigh",
  "last_minute_cancellation",
  "moving_goalposts",
  "passive_aggression",
  "interrupting",
  "tone_of_voice",
  "forgot_the_thing",
] as const;

export type ChargeId = (typeof CHARGE_IDS)[number];

export function isChargeId(value: unknown): value is ChargeId {
  return typeof value === "string" && (CHARGE_IDS as readonly string[]).includes(value);
}

// What the verdict stores: only fixed-list ids (custom charges live in verdict_texts).
export type VerdictCharges = { a: ChargeId[]; b: ChargeId[]; both: ChargeId[] };
