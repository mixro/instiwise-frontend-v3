import { describe, expect, it } from "vitest";
import { formatTzPhone, normalizeTzPhone, whatsAppUrl } from "./phone";

describe("normalizeTzPhone", () => {
  it.each([
    ["0754321987", "+255754321987"],
    ["0754 321 987", "+255754321987"],
    ["+255 754 321 987", "+255754321987"],
    ["255754321987", "+255754321987"],
    ["(0754) 321-987", "+255754321987"],
    ["0687 123 456", "+255687123456"],
  ])("normalises %j to %s", (input, expected) => {
    expect(normalizeTzPhone(input)).toBe(expected);
  });

  it.each(["", "075432198", "07543219877", "+254754321987", "0054321987", "phone"])(
    "rejects %j",
    (input) => {
      expect(normalizeTzPhone(input)).toBeNull();
    },
  );
});

describe("formatTzPhone and whatsAppUrl", () => {
  it("groups the digits for reading", () => {
    expect(formatTzPhone("+255754321987")).toBe("+255 754 321 987");
    expect(formatTzPhone("not a number")).toBe("not a number");
  });

  it("builds a wa.me link with digits only", () => {
    expect(whatsAppUrl("+255754321987")).toBe("https://wa.me/255754321987");
  });
});
