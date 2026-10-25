import { describe, expect, it } from "vitest";
import { presetPeriod, readPeriod } from "./period";

describe("period presets", () => {
  it.each([
    ["month", "2026-10-25", { from: "2026-10-01", to: "2026-10-25" }],
    ["lastMonth", "2026-10-25", { from: "2026-09-01", to: "2026-09-30" }],
    ["lastMonth", "2026-01-10", { from: "2025-12-01", to: "2025-12-31" }],
    ["lastMonth", "2026-03-05", { from: "2026-02-01", to: "2026-02-28" }],
    ["quarter", "2026-10-25", { from: "2026-10-01", to: "2026-10-25" }],
    ["quarter", "2026-05-14", { from: "2026-04-01", to: "2026-05-14" }],
    ["year", "2026-10-25", { from: "2026-01-01", to: "2026-10-25" }],
  ] as const)("%s on %s", (preset, today, period) => {
    expect(presetPeriod(preset, today)).toEqual(period);
  });
});

describe("the period in the address", () => {
  const read = (query: string) => readPeriod(new URLSearchParams(query), "2026-10-25");

  it("defaults to this month, also for unknown values", () => {
    expect(read("")).toEqual({ preset: "month", period: { from: "2026-10-01", to: "2026-10-25" } });
    expect(read("period=decade").preset).toBe("month");
  });

  it("reads a preset", () => {
    expect(read("period=year").period).toEqual({ from: "2026-01-01", to: "2026-10-25" });
  });

  it("reads a custom range and refuses a backwards or incomplete one", () => {
    expect(read("period=custom&from=2026-05-01&to=2026-06-30").period).toEqual({
      from: "2026-05-01",
      to: "2026-06-30",
    });
    expect(read("period=custom&from=2026-07-01&to=2026-06-30")).toMatchObject({
      period: null,
      error: "invalid",
    });
    expect(read("period=custom&from=2026-07-01")).toMatchObject({ period: null, error: "missing" });
  });
});
