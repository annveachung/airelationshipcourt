import { PANEL_ROLES, type PanelRole } from "@/lib/cases/aggregate";
import type { Analysis } from "../schemas";
import {
  DATA_NOT_INSTRUCTIONS,
  formatFollowUps,
  formatTestimony,
  NAME_TOKENS,
  SAFETY_RULE,
  type FollowUpQA,
  type PartnerTestimony,
} from "./format";

export { PANEL_ROLES };

// Each member sees the same evidence through a different lens.
const ROLE_BRIEFS: Record<PanelRole, { title: string; lens: string }> = {
  jury: {
    title: "the Jury",
    lens:
      "Fairness and responsibility. Weigh who did what, whether their actions were reasonable, how consistent " +
      "each account is with itself and with the follow-up answers, and who had the better chance to prevent the problem.",
  },
  family_counsellor: {
    title: "the Family Counsellor",
    lens:
      "Communication and emotional needs. Weigh how each partner communicated, whether expectations were made clear, " +
      "what each person needed, relationship dynamics, and who escalated or de-escalated.",
  },
  social_worker: {
    title: "the Social Worker",
    lens:
      "Circumstances and context. Weigh outside stress, workload, family and social pressure, and other situational " +
      "factors that made the conflict more likely or harder to handle, and how much each partner could reasonably control.",
  },
};

// Keep this example in sync with `panelAssessmentSchema` (a test checks that it parses).
export const PANEL_EXAMPLE = {
  responsibility_partner_a: 40,
  responsibility_partner_b: 60,
  primary_issue: "Communication",
  secondary_issues: ["Expectations"],
  reasoning_summary:
    "[[B]] changed the plans without saying so, which left [[A]] guessing. [[A]]'s sharp reply escalated it, but the first miss was [[B]]'s.",
  feedback_partner_a: "Your frustration was fair; ask what happened before assuming why.",
  feedback_partner_b: "A quick heads-up would have saved the whole evening.",
  recommendations: ["Agree how to share last-minute changes"],
};

export function panelMessages(
  role: PanelRole,
  a: PartnerTestimony,
  b: PartnerTestimony,
  analysis: Analysis,
  followUps: { a: FollowUpQA[]; b: FollowUpQA[] },
) {
  const { title, lens } = ROLE_BRIEFS[role];
  const system = `You are ${title} on a three-member panel at a lighthearted but fair "relationship court".
Two partners have each given a private account of one disagreement and answered follow-up questions. You judge on
your own, without seeing the other panel members' opinions.

Your lens: ${lens}

${DATA_NOT_INSTRUCTIONS}
${NAME_TOKENS}

Do this:
- Give each partner a responsibility score from 0 to 100 for THIS specific conflict only (not the relationship as a
  whole). They should roughly add up to 100. Commit to a view: do not default to 50/50 unless they are truly equal.
- primary_issue: one to three words. secondary_issues: up to three short items.
- reasoning_summary: 2 to 4 sentences. Warm and witty, kind underneath, never cruel; the humour should never land on
  something genuinely painful.
- feedback_partner_a / feedback_partner_b: one or two honest but supportive sentences each, addressed to that person.
- recommendations: up to three short, practical suggestions.
- ${SAFETY_RULE}

Respond with only a JSON object in exactly this shape (values are illustrative):
${JSON.stringify(PANEL_EXAMPLE, null, 2)}`;

  const user = `${formatTestimony("Partner A", a)}

${formatTestimony("Partner B", b)}

${formatFollowUps("Partner A", followUps.a)}

${formatFollowUps("Partner B", followUps.b)}

<analysis>
${JSON.stringify(analysis, null, 2)}
</analysis>

Respond with only the JSON object.`;
  return { system, user };
}
