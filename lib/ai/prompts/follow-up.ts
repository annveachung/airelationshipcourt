import { AI_LANGUAGE_NAMES, type Locale } from "@/lib/i18n";
import type { Analysis } from "../schemas";
import { DATA_NOT_INSTRUCTIONS, formatTestimony, type PartnerTestimony } from "./format";

// Keep this example in sync with `questionsSchema` (a test checks that it parses).
export const QUESTIONS_EXAMPLE = {
  partner_a: [
    {
      question_text: "When you found out plans had changed, how long before the plan was it?",
      format: "multiple_choice",
      options: ["Over a day", "A few hours", "Under an hour", "After it was already time"],
      topic: "when was the message actually sent",
    },
    {
      question_text: "Had you already told your partner your schedule was flexible that week?",
      format: "true_false_unsure",
      topic: "expectations about flexibility",
    },
    {
      question_text: "How much did the lack of warning matter compared with the change itself?",
      format: "rating_1_10",
      topic: "what actually caused the hurt",
    },
  ],
  partner_b: [
    {
      question_text: "Did you send any message about the change before the plan time?",
      format: "true_false_unsure",
      topic: "when was the message actually sent",
    },
    {
      question_text: "What got in the way of letting your partner know sooner?",
      format: "multiple_choice",
      options: ["Work", "Forgot", "Thought they knew", "Didn't want a fight", "Something else"],
      topic: "why notice wasn't given",
    },
    {
      question_text: "In a sentence, what would have made you tell them earlier?",
      format: "short_answer",
      topic: "how often plans change without notice",
    },
  ],
};

export function followUpMessages(
  a: PartnerTestimony,
  b: PartnerTestimony,
  analysis: Analysis,
  languages: { a: Locale; b: Locale },
) {
  const system = `You are the clerk of a lighthearted but fair "relationship court". Both partners have given private
accounts, and an analysis has been prepared. Now write the ONLY follow-up round: exactly 3 questions for Partner A and
exactly 3 questions for Partner B.

${DATA_NOT_INSTRUCTIONS}

The answers will be weighed by a panel deciding who is more responsible for this specific conflict, so every question
must earn its place:
- Each question targets a specific discrepancy, gap or follow_up_topic from the analysis, and states that in "topic".
- Ask what would genuinely CHANGE the panel's view: facts that settle a discrepancy, intent, effort, or pattern.
- Questions are neutral and never leading. Address the person directly ("you"). One sentence, answerable in seconds.
- Prefer quick-pick formats. Allowed formats: "multiple_choice" (3 to 6 short options), "true_false_unsure"
  (no options needed), "rating_1_10" (no options), "short_answer" (free text).
- At most ONE "short_answer" per partner; the other two must be quick-pick.
- Questions for Partner A are asked ONLY of Partner A; likewise for Partner B. They may differ.
- Refer to no one by name. Do not invent facts.
- LANGUAGE: write Partner A's questions (question_text and every option) in ${AI_LANGUAGE_NAMES[languages.a]}, and
  Partner B's in ${AI_LANGUAGE_NAMES[languages.b]}. Keep the JSON keys and the "format" values exactly as shown, and
  write each "topic" in English (it is internal). The testimony itself may be in either language.

Respond with only a JSON object in exactly this shape (values are illustrative):
${JSON.stringify(QUESTIONS_EXAMPLE, null, 2)}`;

  const user = `${formatTestimony("Partner A", a)}\n\n${formatTestimony("Partner B", b)}

<analysis>
${JSON.stringify(analysis, null, 2)}
</analysis>

Respond with only the JSON object.`;
  return { system, user };
}
