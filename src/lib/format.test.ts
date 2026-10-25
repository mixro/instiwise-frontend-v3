import { describe, expect, it } from "vitest";
import {
  formatBasisPoints,
  formatDate,
  formatDateTime,
  formatFileSize,
  formatMonthShort,
  formatTzs,
  formatTzsCompact,
} from "./format";

describe("formatTzs", () => {
  it("formats whole shillings in English and Swahili", () => {
    expect(formatTzs(450000, "en")).toMatch(/450[,.\s]?000/);
    expect(formatTzs(450000, "sw")).toMatch(/450[,.\s]?000/);
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

describe("formatDateTime", () => {
  it("shows Dar es Salaam time", () => {
    // 07:05 UTC is 10:05 in Dar es Salaam.
    expect(formatDateTime("2026-10-15T07:05:00Z", "en")).toMatch(/10:05/);
  });
});

describe("formatFileSize", () => {
  it("picks a readable unit", () => {
    expect(formatFileSize(820, "en")).toMatch(/820\s?byte/);
    expect(formatFileSize(820_000, "en")).toMatch(/820\s?kB/);
    expect(formatFileSize(4_200_000, "en")).toMatch(/4\.2\s?MB/);
    expect(formatFileSize(46_000_000, "en")).toMatch(/46\s?MB/);
    expect(formatFileSize(4_200_000, "sw")).toMatch(/MB\s?4\.2/);
  });
});

describe("chart and margin formats", () => {
  it("shortens amounts for chart labels in both languages", () => {
    expect(formatTzsCompact(12_400_000, "en")).toBe("12.4M");
    expect(formatTzsCompact(-470_000, "en")).toBe("-470K");
    expect(formatTzsCompact(350_000, "sw")).toMatch(/^elfu\s350$/);
    expect(formatTzsCompact(0, "en")).toBe("0");
  });

  it("shows basis points as a percentage", () => {
    expect(formatBasisPoints(2350, "en")).toBe("23.5%");
    expect(formatBasisPoints(-1250, "en")).toBe("-12.5%");
    expect(formatBasisPoints(10_000, "sw")).toBe("100%");
  });

  it("names months briefly", () => {
    expect(formatMonthShort("2026-10", "en")).toBe("Oct");
    expect(formatMonthShort("2026-10", "sw")).toBe("Okt");
    expect(formatMonthShort("2026-01", "en", true)).toMatch(/^Jan\s2026$/);
  });
});
