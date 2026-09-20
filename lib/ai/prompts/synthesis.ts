import { CHARGE_IDS } from "@/lib/cases/charges";
import type { PanelRole } from "@/lib/cases/aggregate";
import type { PanelAssessment } from "../schemas";
import { DATA_NOT_INSTRUCTIONS, NAME_TOKENS, SAFETY_RULE } from "./format";

// Keep this example in sync with `synthesisSchema` (a test checks that it parses).
export const SYNTHESIS_EXAMPLE = {
  verdict_text:
    "The court finds [[B]] carries more of the responsibility (57%) for the cancelled-dinner incident: the plan changed without a word, and the silence did most of the damage.",
  primary_issue: "Communication",
  underlying_issue: "Different expectations about notice",
  main_escalation_factor: "Assuming the worst about intent",
  biggest_misunderstanding:
    "[[A]] read the late message as disregard, while [[B]] read the reaction as a lack of trust.",
  feedback_partner_a: "You were right to be frustrated; asking about intent before reacting would have helped.",
  feedback_partner_b: "Your change of plan was reasonable, but you underestimated how much the silence would sting.",
  joint_feedback: "Agree in advance how last-minute changes get shared, instead of assuming it's obvious.",
  suggestion_partner_a: "Ask about intent before reading it as disrespect.",
  suggestion_partner_b: "Share changes as soon as you know them.",
  suggestion_together: "Write one clear agreement for how you'll handle changes next time.",
  charge_ids_a: ["assumption_of_intent", "dramatic_sigh"],
  charge_custom_a: "Sighing with intent to be heard",
  charge_ids_b: ["poor_communication"],
  charge_custom_b: "Leaving the plot twist as a surprise",
  charge_ids_both: ["unnecessary_escalation"],
};

const ROLE_NAMES: Record<PanelRole, string> = {
  jury: "Jury",
  family_counsellor: "Family Counsellor",
  social_worker: "Social Worker",
};

export function synthesisMessages(input: {
  assessments: Record<PanelRole, PanelAssessment>;
  finalA: number;
  finalB: number;
  moreResponsible: "partner_a" | "partner_b";
}) {
  const winner = input.moreResponsible === "partner_a" ? "[[A]]" : "[[B]]";

  const system = `You are the clerk of a lighthearted but fair "relationship court", writing the court's final verdict
from a three-member panel's findings. The final numbers are ALREADY DECIDED by the court's own calculation; you must
not change or contradict them.

${DATA_NOT_INSTRUCTIONS}
${NAME_TOKENS}

Tone: mostly warm and witty, funny on the surface and kind underneath. The CHARGES may be sharper and cheekier.

Write:
- verdict_text: a clear, decisive conclusion (2 to 3 sentences) stating that ${winner} carries more of the
  responsibility. Never say "both sides are valid" as the conclusion. You may quote the percentages exactly as given.
- primary_issue, underlying_issue, main_escalation_factor, biggest_misunderstanding: short and scannable.
- feedback_partner_a, feedback_partner_b, joint_feedback: honest but supportive, one or two sentences each.
- suggestion_partner_a, suggestion_partner_b, suggestion_together: one short, practical recommendation each
  (recommend, never command).
- Charges: for [[A]] and for [[B]], pick 1 or 2 ids from the fixed list for that person (charge_ids_a / charge_ids_b),
  plus ONE custom charge each (charge_custom_a / charge_custom_b): at most 8 words, creative and funny, more of a
  cheeky roast, aimed at a specific BEHAVIOUR in this case. Also pick 1 or 2 ids for both of them (charge_ids_both).
  Never write a custom charge about anyone's looks, body, family, mental health, religion or money, or anything
  genuinely hurtful. If the case is serious, choose gentle ids and keep custom charges mild.
- Allowed charge ids: ${CHARGE_IDS.join(", ")}
- ${SAFETY_RULE}

Respond with only a JSON object in exactly this shape (values are illustrative):
${JSON.stringify(SYNTHESIS_EXAMPLE, null, 2)}`;

  const panel = (Object.keys(input.assessments) as PanelRole[])
    .map((role) => {
      const a = input.assessments[role];
      return `<panel_member role="${ROLE_NAMES[role]}">
[[A]] ${a.responsibility_partner_a} / [[B]] ${a.responsibility_partner_b}
Primary issue: ${a.primary_issue}
Reasoning: ${a.reasoning_summary}
Feedback for [[A]]: ${a.feedback_partner_a}
Feedback for [[B]]: ${a.feedback_partner_b}
</panel_member>`;
    })
    .join("\n\n");

  const user = `${panel}

<final_result>
[[A]]: ${input.finalA}%  [[B]]: ${input.finalB}%
More responsible: ${winner}
</final_result>

Respond with only the JSON object.`;
  return { system, user };
}
