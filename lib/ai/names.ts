// AI text refers to the partners as the placeholders [[A]] and [[B]]. Real display names
// are swapped in only when the text is shown, so nothing personal is sent to the model and
// the placeholders survive translation.

const A = /\[\[\s*A\s*\]\]/gi;
const B = /\[\[\s*B\s*\]\]/gi;

export function renderNames(text: string, names: { a: string; b: string }): string {
  return text.replace(A, names.a).replace(B, names.b);
}

/** Which placeholders appear in a piece of text (used to check translations kept them). */
export function placeholdersIn(text: string): Set<"A" | "B"> {
  const found = new Set<"A" | "B">();
  if (new RegExp(A.source, "i").test(text)) found.add("A");
  if (new RegExp(B.source, "i").test(text)) found.add("B");
  return found;
}
