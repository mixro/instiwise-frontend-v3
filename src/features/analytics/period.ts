import type { Period } from "@/features/expenses/api";
import { addDays, localDate } from "@/lib/dates";

/** Calendar days in Dar es Salaam, both inclusive, as the analytics endpoints take them. */
export type { Period };

export const PERIOD_PRESETS = ["month", "lastMonth", "quarter", "year", "custom"] as const;
export type PeriodPreset = (typeof PERIOD_PRESETS)[number];

const DATE = /^\d{4}-\d{2}-\d{2}$/;

const firstOfMonth = (year: number, month: number) =>
  `${year}-${String(month).padStart(2, "0")}-01`;

/**
 * The days a preset covers. Current periods run to today, so the trend never
 * shows months that have not happened yet; last month is the whole month.
 */
export function presetPeriod(preset: Exclude<PeriodPreset, "custom">, today = localDate()): Period {
  const [year, month] = today.split("-").map(Number) as [number, number];
  switch (preset) {
    case "month":
      return { from: firstOfMonth(year, month), to: today };
    case "lastMonth": {
      const start = month === 1 ? firstOfMonth(year - 1, 12) : firstOfMonth(year, month - 1);
      return { from: start, to: addDays(firstOfMonth(year, month), -1) };
    }
    case "quarter":
      return { from: firstOfMonth(year, Math.floor((month - 1) / 3) * 3 + 1), to: today };
    case "year":
      return { from: firstOfMonth(year, 1), to: today };
  }
}

export type PeriodSelection =
  | { preset: PeriodPreset; period: Period; error?: undefined }
  | { preset: "custom"; period: null; from: string; to: string; error: "missing" | "invalid" };

/**
 * The period in the address (?period=quarter, or ?period=custom&from=…&to=…),
 * so a view can be linked to and survives a reload. Anything unknown is this month.
 */
export function readPeriod(params: URLSearchParams, today = localDate()): PeriodSelection {
  const preset = params.get("period");
  if (preset === "custom") {
    const from = params.get("from") ?? "";
    const to = params.get("to") ?? "";
    if (!DATE.test(from) || !DATE.test(to)) {
      return { preset, period: null, from, to, error: "missing" };
    }
    if (from > to) return { preset, period: null, from, to, error: "invalid" };
    return { preset, period: { from, to } };
  }
  const known = PERIOD_PRESETS.find((candidate) => candidate === preset && candidate !== "custom");
  const chosen = (known ?? "month") as Exclude<PeriodPreset, "custom">;
  return { preset: chosen, period: presetPeriod(chosen, today) };
}
