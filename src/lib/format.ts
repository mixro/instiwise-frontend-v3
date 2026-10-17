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
