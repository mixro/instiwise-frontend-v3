import { describe, expect, it } from "vitest";
import { formatDate, formatTzs } from "./format";

describe("formatTzs", () => {
  it("formats whole shillings in English and Swahili", () => {
    expect(formatTzs(450000, "en")).toMatch(/450[,.\s  ]?000/);
    expect(formatTzs(450000, "sw")).toMatch(/450[,.\s  ]?000/);
  });

  it("never shows decimals", () => {
    expect(formatTzs(1200000, "en")).not.toMatch(/[.,]\d{2}$/);
  });

  it("refuses fractional amounts, because money is stored as whole TZS", () => {
    expect(() => formatTzs(10.5, "en")).toThrow(RangeError);
  });

  it("handles zero", () => {
    expect(formatTzs(0, "en")).toMatch(/0/);
  });
});

describe("formatDate", () => {
  it("includes the year", () => {
    expect(formatDate("2026-11-28", "en")).toContain("2026");
    expect(formatDate("2026-11-28", "sw")).toContain("2026");
  });

  it("uses Dar es Salaam time, so late-evening UTC lands on the next local day", () => {
    // 22:30 UTC on 27 Nov is 01:30 on 28 Nov in Dar es Salaam (UTC+3).
    expect(formatDate("2026-11-27T22:30:00Z", "en")).toContain("28");
  });
});
