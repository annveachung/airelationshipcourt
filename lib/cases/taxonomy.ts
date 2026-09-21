// Pure and unit-tested. The analysis' issue and conflict-type labels come from FIXED lists,
// so they can be translated deterministically and counted reliably (Phase 8's analytics).

export const ISSUE_CATEGORIES = [
  "Communication",
  "Expectations",
  "Assumptions",
  "Trust",
  "Stress",
  "Time and priorities",
  "Chores or money",
  "Family or friends",
  "Other",
] as const;
export type IssueCategory = (typeof ISSUE_CATEGORIES)[number];

export const CONFLICT_TYPES = [
  "Misunderstanding",
  "Recurring pattern",
  "Clash of priorities",
  "Broken promise",
  "Different styles",
  "Other",
] as const;
export type ConflictType = (typeof CONFLICT_TYPES)[number];

// Models don't always use our exact wording; map their words to the closest label.
const ISSUE_HINTS: [RegExp, IssueCategory][] = [
  [/communicat|talk|listen|silence|notice/, "Communication"],
  [/expect/, "Expectations"],
  [/assum|intent|mind.?read/, "Assumptions"],
  [/trust|honest|jealous|lie|betray/, "Trust"],
  [/stress|tired|exhaust|overwhelm|burnout|work/, "Stress"],
  [/time|priorit|schedul|plans?\b|late/, "Time and priorities"],
  [/chore|money|financ|budget|house|clean|spend/, "Chores or money"],
  [/family|friend|in-?law|parent/, "Family or friends"],
];

const CONFLICT_HINTS: [RegExp, ConflictType][] = [
  [/misunderstand|miscommunic/, "Misunderstanding"],
  [/recurr|pattern|repeat|again|habit/, "Recurring pattern"],
  [/priorit|clash|competing|schedule/, "Clash of priorities"],
  [/promise|commit|broken|let down/, "Broken promise"],
  [/style|differen|values|personality|approach/, "Different styles"],
];

function match<T extends string>(raw: string, exact: readonly T[], hints: [RegExp, T][], fallback: T): T {
  const text = raw.trim().toLowerCase();
  const direct = exact.find((label) => label.toLowerCase() === text);
  if (direct) return direct;
  for (const [pattern, label] of hints) if (pattern.test(text)) return label;
  return fallback;
}

export function normalizeIssue(raw: string): IssueCategory {
  return match(raw, ISSUE_CATEGORIES, ISSUE_HINTS, "Other");
}

export function normalizeConflictType(raw: string): ConflictType {
  return match(raw, CONFLICT_TYPES, CONFLICT_HINTS, "Other");
}
