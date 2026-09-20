import { describe, expect, it } from "vitest";
import en from "@/messages/en.json";
import zh from "@/messages/zh-Hant.json";
import { CHARGE_IDS } from "@/lib/cases/charges";

type Tree = { [key: string]: string | Tree };

function flatten(tree: Tree, prefix = ""): Record<string, string> {
  return Object.entries(tree).reduce<Record<string, string>>((acc, [key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return typeof value === "string" ? { ...acc, [path]: value } : { ...acc, ...flatten(value, path) };
  }, {});
}

const enFlat = flatten(en as Tree);
const zhFlat = flatten(zh as Tree);
const placeholders = (s: string) => (s.match(/\{\w+\}|<\/?\w+>/g) ?? []).sort().join(",");

describe("translations", () => {
  it("have exactly the same keys in English and Traditional Chinese", () => {
    expect(Object.keys(zhFlat).sort()).toEqual(Object.keys(enFlat).sort());
  });

  it("have no empty strings", () => {
    for (const [key, value] of [...Object.entries(enFlat), ...Object.entries(zhFlat)]) {
      expect(value.trim(), key).not.toBe("");
    }
  });

  it("keep the same {placeholders} and <tags> in both languages", () => {
    for (const key of Object.keys(enFlat)) {
      expect(placeholders(zhFlat[key]), key).toBe(placeholders(enFlat[key]));
    }
  });
});

describe("charges", () => {
  it("every fixed-list charge id has a label in both languages", () => {
    for (const id of CHARGE_IDS) {
      expect(enFlat[`charges.${id}`], id).toBeTruthy();
      expect(zhFlat[`charges.${id}`], id).toBeTruthy();
    }
  });
});
