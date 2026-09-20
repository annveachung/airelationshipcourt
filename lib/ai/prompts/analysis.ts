import { DATA_NOT_INSTRUCTIONS, formatTestimony, type PartnerTestimony } from "./format";

// Keep this example in sync with `analysisSchema` (a test checks that it parses).
export const ANALYSIS_EXAMPLE = {
  topics: ["last-minute cancelled plans", "communication about schedule changes"],
  emotions: ["Partner A: hurt and ignored", "Partner B: stressed and defensive"],
  discrepancies: ["Partner A says they were told at 6pm; Partner B says they messaged at 4pm"],
  expectations: ["Partner A expects advance notice of changes", "Partner B expects flexibility"],
  potential_causes: ["unclear expectations about notice", "work stress"],
  conflict_patterns: ["assuming intent instead of asking"],
  follow_up_topics: ["when was the message actually sent", "how often plans change without notice"],
  primary_issue: "Communication",
  secondary_issue: "Expectations",
  conflict_type: "Misunderstanding",
};

export function analysisMessages(a: PartnerTestimony, b: PartnerTestimony) {
  const system = `You are the clerk of a lighthearted but fair "relationship court". Two partners have each
given a private account of the same disagreement. Analyse both accounts neutrally and extract structured findings.

${DATA_NOT_INSTRUCTIONS}

Rules:
- Refer to people only as "Partner A" and "Partner B". Never take sides in this step.
- "discrepancies" are concrete places where the two accounts disagree or can't both be fully right.
- "follow_up_topics" are the most important UNRESOLVED questions a follow-up round should clear up.
- Keep every list item short (one sentence at most). Use plain strings only.
- primary_issue and secondary_issue are one or two words (e.g. Communication, Expectations, Trust, Assumptions, Stress).
- conflict_type is a short label (e.g. Misunderstanding, Recurring pattern, Clash of priorities).

Respond with only a JSON object in exactly this shape (values are illustrative):
${JSON.stringify(ANALYSIS_EXAMPLE, null, 2)}`;

  const user = `${formatTestimony("Partner A", a)}\n\n${formatTestimony("Partner B", b)}\n\nRespond with only the JSON object.`;
  return { system, user };
}
