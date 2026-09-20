import { describe, expect, it } from "vitest";
import { extractJson, JsonExtractError } from "./json";

describe("extractJson", () => {
  it("parses plain JSON", () => {
    expect(extractJson('{"a":1}')).toEqual({ a: 1 });
  });

  it("strips code fences the model adds", () => {
    expect(extractJson('```json\n{"a":1}\n```')).toEqual({ a: 1 });
  });

  it("ignores prose before and after the object", () => {
    expect(extractJson('Sure! Here is the result:\n{"a":{"b":2}}\nHope that helps.')).toEqual({
      a: { b: 2 },
    });
  });

  it("tolerates trailing commas", () => {
    expect(extractJson('{"a":[1,2,],"b":"x",}')).toEqual({ a: [1, 2], b: "x" });
  });

  it("throws a typed error when there is no object", () => {
    expect(() => extractJson("I can't do that.")).toThrow(JsonExtractError);
  });

  it("throws on truncated JSON", () => {
    expect(() => extractJson('{"a":[1,2')).toThrow(JsonExtractError);
  });
});
