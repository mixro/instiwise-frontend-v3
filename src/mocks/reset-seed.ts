import { DEMO_RESET_CODES } from "./demo-data";

/** A password reset code as the server keeps it. Only its times ever leave the server. */
export interface MockResetCode {
  code: string;
  /** A client's or an operator's id. */
  accountId: string;
  issuedAt: string;
  expiresAt: string;
  issuedBy: { id: string; name: string };
  usedAt?: string;
  cancelledAt?: string;
  /** Refused completions on this code; at RESET_LOCK_AFTER it is locked. */
  failedAttempts: number;
}

export const RESET_CODE_HOURS = 24;
export const RESET_LOCK_AFTER = 5;

const HOUR = 60 * 60 * 1000;
const hoursAgo = (hours: number) => new Date(Date.now() - hours * HOUR).toISOString();
const REHEMA = { id: "adm_rehema", name: "Rehema Said" };

/** The demo codes (demo-data.ts), with times relative to now so they stay in their state. */
export function seedResetCodes(): MockResetCode[] {
  return DEMO_RESET_CODES.map(({ code, accountId, state }) => {
    const issuedHoursAgo = state === "EXPIRED" ? 30 : 2;
    const issuedAt = hoursAgo(issuedHoursAgo);
    return {
      code,
      accountId,
      issuedAt,
      expiresAt: hoursAgo(issuedHoursAgo - RESET_CODE_HOURS),
      issuedBy: REHEMA,
      usedAt: state === "USED" ? hoursAgo(1) : undefined,
      cancelledAt: state === "CANCELLED" ? hoursAgo(1) : undefined,
      failedAttempts: state === "LOCKED" ? RESET_LOCK_AFTER : 0,
    };
  });
}
