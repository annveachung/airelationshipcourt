import { describe, expect, it } from "vitest";
import { placeholdersIn, renderNames } from "./names";

describe("renderNames", () => {
  it("swaps the placeholders for display names", () => {
    expect(renderNames("[[A]] and [[B]] argued; [[A]] won.", { a: "Sam", b: "Alex" })).toBe(
      "Sam and Alex argued; Sam won.",
    );
  });
  it("tolerates stray spaces and case", () => {
    expect(renderNames("[[ a ]] / [[b]]", { a: "Sam", b: "Alex" })).toBe("Sam / Alex");
  });
  it("leaves text without placeholders alone", () => {
    expect(renderNames("No names here.", { a: "Sam", b: "Alex" })).toBe("No names here.");
  });
});

describe("placeholdersIn", () => {
  it("reports which placeholders are present", () => {
    expect([...placeholdersIn("[[A]] only")]).toEqual(["A"]);
    expect([...placeholdersIn("[[A]] and [[B]]")].sort()).toEqual(["A", "B"]);
    expect(placeholdersIn("none").size).toBe(0);
  });
});
