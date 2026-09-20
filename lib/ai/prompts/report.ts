import type { PanelRole } from "@/lib/cases/aggregate";
import type { Analysis } from "../schemas";
import { DATA_NOT_INSTRUCTIONS, formatFollowUps, NAME_TOKENS, SAFETY_RULE, type FollowUpQA } from "./format";

// Keep this example in sync with `reportTextsSchema` (a test checks that it parses).
export const REPORT_EXAMPLE = {
  case_summary:
    "[[A]] and [[B]] disagreed after a dinner plan changed at the last minute. [[A]] felt ignored; [[B]] felt punished for a work emergency.",
  primary_conflict: "Communication about last-minute changes",
  secondary_issues: "Different expectations about notice\nStress from work",
  emotional_themes: "[[A]]: hurt and disappointed\n[[B]]: stressed and guilty",
  key_discrepancies: "The message was sent at 6:15, but [[A]] expected earlier notice\n[[B]] saw the silence as punishment; [[A]] meant it as hurt",
  follow_up_findings: "Both agreed this has happened before\n[[B]] admitted they could have flagged the risk earlier",
  treaty_personal_1: "[[B]] will send a 'might be late' text the moment plans are at risk.",
  treaty_personal_2: "[[A]] will say what hurts out loud instead of going silent.",
  treaty_personal_3: "Both will reschedule a proper do-over dinner within the week.",
};

const ROLE_NAMES: Record<PanelRole, string> = {
  jury: "Jury",
  family_counsellor: "Family Counsellor",
  social_worker: "Social Worker",
};

export function reportMessages(input: {
  analysis: Analysis;
  finalA: number;
  finalB: number;
  moreResponsible: "partner_a" | "partner_b";
  panelSummaries: Record<PanelRole, string>;
  followUps: { a: FollowUpQA[]; b: FollowUpQA[] };
}) {
  const winner = input.moreResponsible === "partner_a" ? "[[A]]" : "[[B]]";

  const system = `You are the clerk of a lighthearted but fair "relationship court", writing the written CASE REPORT and
three personalised "peace treaty" clauses for a case that has already been decided. The verdict and numbers are fixed;
do not change or contradict them.

${DATA_NOT_INSTRUCTIONS}
${NAME_TOKENS}

Tone: neutral and readable, warm and lightly witty. Keep every item short and scannable. Use only facts that
appear in the material below; never invent details.

Fields:
- case_summary: 2 to 3 neutral sentences: what the disagreement was about and how each partner experienced it.
- primary_conflict: one short phrase. secondary_issues: 1 to 3 short items, one per line.
- emotional_themes: 2 to 4 short items, one per line (who felt what).
- key_discrepancies: 2 to 4 short items, one per line: concrete places the two accounts differ.
- follow_up_findings: 2 to 3 short items, one per line: what the follow-up answers cleared up or confirmed.
- The follow-up answers are background only: SUMMARISE what they revealed inside case_summary, key_discrepancies and
  follow_up_findings. Never quote a question or an answer word for word, and never list them.
- treaty_personal_1..3: three MUTUAL, friendly, specific "peace treaty" clauses drawn from THIS case (one sentence
  each, at most 20 words). Playful and kind, each asking something small and doable of one or both partners, never
  blaming or humiliating anyone.
- Multi-item fields use a newline character between items, with no bullets or numbering.
- ${SAFETY_RULE} If the case is serious, make the three treaty clauses gentle and supportive, not jokey.

Respond with only a JSON object in exactly this shape (values are illustrative):
${JSON.stringify(REPORT_EXAMPLE, null, 2)}`;

  const panel = (Object.keys(input.panelSummaries) as PanelRole[])
    .map((r) => `${ROLE_NAMES[r]}: ${input.panelSummaries[r]}`)
    .join("\n");

  const user = `<verdict>
Final split: [[A]] ${input.finalA}% / [[B]] ${input.finalB}%. More responsible: ${winner}.
</verdict>

<panel>
${panel}
</panel>

<analysis>
${JSON.stringify(input.analysis, null, 2)}
</analysis>

${formatFollowUps("Partner A", input.followUps.a)}

${formatFollowUps("Partner B", input.followUps.b)}

Respond with only the JSON object.`;
  return { system, user };
}
