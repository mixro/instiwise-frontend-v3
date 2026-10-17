import { describe, expect, it } from "vitest";
import enCommon from "./locales/en/common.json";
import swCommon from "./locales/sw/common.json";

type Tree = { [key: string]: string | Tree };

function flatten(tree: Tree, prefix = ""): string[] {
  return Object.entries(tree).flatMap(([key, value]) =>
    typeof value === "string" ? [`${prefix}${key}`] : flatten(value, `${prefix}${key}.`),
  );
}

describe("translations", () => {
  it("English and Swahili have exactly the same keys", () => {
    expect(flatten(swCommon).sort()).toEqual(flatten(enCommon).sort());
  });

  it("keeps interpolation placeholders in both languages", () => {
    expect(enCommon.starter.api.connected).toContain("{{version}}");
    expect(swCommon.starter.api.connected).toContain("{{version}}");
  });
});
