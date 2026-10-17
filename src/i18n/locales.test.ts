import { describe, expect, it } from "vitest";
import enCommon from "./locales/en/common.json";
import swCommon from "./locales/sw/common.json";

type Tree = { [key: string]: string | Tree };

function entries(tree: Tree, prefix = ""): [string, string][] {
  return Object.entries(tree).flatMap(([key, value]) =>
    typeof value === "string" ? [[`${prefix}${key}`, value]] : entries(value, `${prefix}${key}.`),
  ) as [string, string][];
}

function placeholders(text: string): string[] {
  return [...text.matchAll(/\{\{\s*(\w+)\s*\}\}/g)].map((match) => match[1] ?? "").sort();
}

describe("translations", () => {
  const en = new Map(entries(enCommon));
  const sw = new Map(entries(swCommon));

  it("English and Swahili have exactly the same keys", () => {
    expect([...sw.keys()].sort()).toEqual([...en.keys()].sort());
  });

  it("keeps the same interpolation placeholders in both languages", () => {
    for (const [key, text] of en) {
      expect(placeholders(sw.get(key) ?? ""), key).toEqual(placeholders(text));
    }
    expect(placeholders(enCommon.dev.api.connected)).toEqual(["version"]);
  });
});
