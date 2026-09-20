// No server-only import: this is pure and unit-tested.

export class JsonExtractError extends Error {
  constructor(message = "No valid JSON object found in the model output.") {
    super(message);
    this.name = "JsonExtractError";
  }
}

/**
 * Pulls a JSON object out of messy model output: strips code fences, ignores
 * prose before/after, and tolerates trailing commas.
 */
export function extractJson(raw: string): unknown {
  const text = raw.replace(/```(?:json)?/gi, "");
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) throw new JsonExtractError();

  const slice = text.slice(start, end + 1);
  try {
    return JSON.parse(slice);
  } catch {
    try {
      return JSON.parse(slice.replace(/,\s*([}\]])/g, "$1"));
    } catch {
      throw new JsonExtractError();
    }
  }
}
