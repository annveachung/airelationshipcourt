import { describe, expect, it } from "vitest";
import { ALL_CLAUSES, normalizeClauses, OPTIONAL_CLAUSES, peaceLevel, REQUIRED_CLAUSE } from "./treaty";

describe("normalizeClauses", () => {
  it("always includes the required clause", () => {
    expect(normalizeClauses([])).toEqual([REQUIRED_CLAUSE]);
    expect(normalizeClauses(["hug"])).toEqual([REQUIRED_CLAUSE, "hug"]);
  });
  it("drops unknown ids and duplicates", () => {
    expect(normalizeClauses(["hug", "hug", "made_up", 5, null])).toEqual([REQUIRED_CLAUSE, "hug"]);
  });
  it("keeps a stable order", () => {
    expect(normalizeClauses(["personal_3", "hug", "snacks"])).toEqual([REQUIRED_CLAUSE, "hug", "snacks", "personal_3"]);
  });
  it("accepts everything when all are ticked", () => {
    expect(normalizeClauses([...ALL_CLAUSES])).toEqual([...ALL_CLAUSES]);
  });
});

describe("peaceLevel", () => {
  const all = { clauses: [REQUIRED_CLAUSE, ...OPTIONAL_CLAUSES] };
  const none = { clauses: [REQUIRED_CLAUSE] };

  it("counts only optional clauses", () => {
    const r = peaceLevel([none, none]);
    expect(r.agreed).toBe(0);
    expect(r.possible).toBe(OPTIONAL_CLAUSES.length * 2);
    expect(r.band).toBe("frosty");
  });
  it("reaches lovebirds when everything is ticked", () => {
    const r = peaceLevel([all, all]);
    expect(r.agreed).toBe(r.possible);
    expect(r.band).toBe("lovebirds");
  });
  it("gives the in-between bands", () => {
    const some = (n: number) => ({ clauses: [REQUIRED_CLAUSE, ...OPTIONAL_CLAUSES.slice(0, n)] });
    expect(peaceLevel([some(2), some(1)]).band).toBe("thawing"); // 3/12 = 25%
    expect(peaceLevel([some(3), some(3)]).band).toBe("warm"); // 6/12 = 50%
  });
  it("handles no signatures", () => {
    expect(peaceLevel([])).toEqual({ agreed: 0, possible: 0, band: "frosty" });
  });
});
