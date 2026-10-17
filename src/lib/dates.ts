import { APP_TIME_ZONE } from "./format";

/** A calendar date (YYYY-MM-DD) as it is in Dar es Salaam at `at`, whatever the browser's zone. */
export function localDate(at: Date = new Date()): string {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(at);
}

/** YYYY-MM-DD plus a number of days (negative goes back). */
export function addDays(date: string, days: number): string {
  const [year, month, day] = date.split("-").map(Number);
  const utc = new Date(Date.UTC(year ?? 1970, (month ?? 1) - 1, (day ?? 1) + days));
  return utc.toISOString().slice(0, 10);
}

/** How far back an operator may date a payment (decided 2026-10-17). Older ones need an admin. */
export const PAYMENT_BACKDATE_DAYS = 30;

/** The dates an operator may record a payment for: today or up to 30 days back, no future. */
export function paymentDateRange(at: Date = new Date()): { min: string; max: string } {
  const today = localDate(at);
  return { min: addDays(today, -PAYMENT_BACKDATE_DAYS), max: today };
}
