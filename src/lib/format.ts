import type { Language } from "@/i18n/languages";

const LOCALES: Record<Language, string> = {
  en: "en-TZ",
  sw: "sw-TZ",
};

/** Time zone used for every date shown to users. */
export const APP_TIME_ZONE = "Africa/Dar_es_Salaam";

/**
 * Format an amount of whole Tanzanian shillings.
 * Money is always an integer number of TZS (see contracts/openapi.yaml).
 */
export function formatTzs(amount: number, language: Language): string {
  if (!Number.isInteger(amount)) {
    throw new RangeError(`TZS amounts must be whole numbers, received ${amount}`);
  }
  return new Intl.NumberFormat(LOCALES[language], {
    style: "currency",
    currency: "TZS",
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(amount);
}

/** Format a date (ISO string or Date) as a medium date in Dar es Salaam time. */
export function formatDate(value: string | Date, language: Language): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat(LOCALES[language], {
    dateStyle: "medium",
    timeZone: APP_TIME_ZONE,
  }).format(date);
}

/** Date and time (messages, receipts), in Dar es Salaam time. */
export function formatDateTime(value: string | Date, language: Language): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat(LOCALES[language], {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: APP_TIME_ZONE,
  }).format(date);
}

/** A file size in the largest sensible unit: "820 kB", "4.2 MB". */
export function formatFileSize(bytes: number, language: Language): string {
  const units = ["byte", "kilobyte", "megabyte", "gigabyte"] as const;
  let value = bytes;
  let unit = 0;
  while (value >= 1000 && unit < units.length - 1) {
    value /= 1000;
    unit += 1;
  }
  return new Intl.NumberFormat(LOCALES[language], {
    style: "unit",
    unit: units[unit],
    unitDisplay: "short",
    maximumFractionDigits: value < 10 && unit > 0 ? 1 : 0,
  }).format(value);
}

/** Reads typed shillings: "2,050,000" or "2 050 000" -> 2050000. Anything else -> NaN. */
export function parseTzs(value: string): number {
  const compact = value.replace(/[\s,]/g, "");
  return /^\d{1,11}$/.test(compact) ? Number(compact) : Number.NaN;
}

/** "2026-10" as "October 2026" / "Oktoba 2026". */
export function formatMonth(month: string, language: Language): string {
  const [year, number] = month.split("-").map(Number);
  return new Intl.DateTimeFormat(LOCALES[language], {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year ?? 1970, (number ?? 1) - 1, 15)));
}

/**
 * Shillings shortened for tight chart labels only ("12.4M", "350K"; Swahili
 * "elfu 350"). Never for an amount someone reads as exact: use formatTzs.
 */
export function formatTzsCompact(amount: number, language: Language): string {
  return new Intl.NumberFormat(LOCALES[language], {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(amount);
}

/** A share the server sends in basis points (2350) as a percentage: "23.5%". */
export function formatBasisPoints(basisPoints: number, language: Language): string {
  return new Intl.NumberFormat(LOCALES[language], {
    style: "percent",
    maximumFractionDigits: 1,
  }).format(basisPoints / 10_000);
}

/** "2026-10" as "Oct" / "Okt", or "Oct 2026" with the year. */
export function formatMonthShort(month: string, language: Language, withYear = false): string {
  const [year, number] = month.split("-").map(Number);
  return new Intl.DateTimeFormat(LOCALES[language], {
    month: "short",
    year: withYear ? "numeric" : undefined,
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year ?? 1970, (number ?? 1) - 1, 15)));
}
