import type { Role } from "@/lib/roles";

/*
 * Demo accounts and invitation codes for the mock backend (VITE_USE_MOCKS=true).
 * Listed on the sign-in and invitation pages in development, so every auth state
 * can be walked by hand. example.com addresses are reserved and never real.
 */

export const DEMO_PASSWORD = "Instiwise2026";

export type DemoAccountState =
  "ACTIVE" | "PENDING_APPROVAL" | "SUSPENDED" | "REJECTED" | "RATE_LIMITED";

export interface DemoAccount {
  email: string;
  name: string;
  role: Role;
  state: DemoAccountState;
}

export const DEMO_ACCOUNTS: DemoAccount[] = [
  { email: "neema@example.com", name: "Neema Mwakyusa", role: "CLIENT", state: "ACTIVE" },
  { email: "baraka@example.com", name: "Baraka Mushi", role: "OPERATOR", state: "ACTIVE" },
  { email: "rehema@example.com", name: "Rehema Said", role: "ADMIN", state: "ACTIVE" },
  { email: "juma@example.com", name: "Juma Kassim", role: "OPERATOR", state: "PENDING_APPROVAL" },
  { email: "asha@example.com", name: "Asha Mrema", role: "CLIENT", state: "SUSPENDED" },
  { email: "busy@example.com", name: "Halima Nyerere", role: "CLIENT", state: "RATE_LIMITED" },
  // Email verification (ADR 0006): Daudi has not confirmed his address yet;
  // Saida is changing hers and has not confirmed the new one.
  { email: "daudi@example.com", name: "Daudi Mrisho", role: "CLIENT", state: "ACTIVE" },
  { email: "saida@example.com", name: "Saida Mfinanga", role: "CLIENT", state: "ACTIVE" },
];

export type DemoCodeOutcome =
  "CLIENT" | "OPERATOR" | "INVITATION_EXPIRED" | "INVITATION_REVOKED" | "INVITATION_ALREADY_USED";

/** Any other well-formed code is INVITATION_NOT_FOUND. */
export const DEMO_CODES: Record<string, DemoCodeOutcome> = {
  "KX7P-M4Q2": "CLIENT",
  "OPR8-T2QW": "OPERATOR",
  "EXPD-2026": "INVITATION_EXPIRED",
  "RVKD-2026": "INVITATION_REVOKED",
  "USED-2026": "INVITATION_ALREADY_USED",
};

export const DEMO_INVITER = "Baraka Mushi";

export type DemoResetCodeState = "VALID" | "EXPIRED" | "USED" | "CANCELLED" | "LOCKED";

/**
 * Password reset codes (ADR 0005), one per state, so every /reset/<code> screen
 * can be reached. Any other well-formed code is RESET_CODE_NOT_FOUND. Neema's
 * is the one to walk the whole reset with; Faraji is a suspended operator, who
 * can set a new password but still cannot sign in.
 */
export const DEMO_RESET_CODES: { code: string; accountId: string; state: DemoResetCodeState }[] = [
  { code: "RST2-NEMA", accountId: "cli_neema", state: "VALID" },
  { code: "RST2-FRJI", accountId: "op_faraji", state: "VALID" },
  { code: "RST2-XPRD", accountId: "cli_saida", state: "EXPIRED" },
  { code: "RST2-USED", accountId: "cli_hamisi", state: "USED" },
  { code: "RST2-CNCL", accountId: "op_zawadi", state: "CANCELLED" },
  { code: "RST2-LOCK", accountId: "cli_grace", state: "LOCKED" },
];

/** Addresses not confirmed yet (every other demo address is verified). */
export const DEMO_UNVERIFIED_EMAILS = ["daudi@example.com", "juma@example.com"];

/** Email changes waiting for confirmation: sign-in address to the new one. */
export const DEMO_PENDING_EMAILS: Record<string, string> = {
  "saida@example.com": "saida.mfinanga@example.com",
};

export type DemoEmailTokenState = "VALID" | "EXPIRED" | "USED" | "CANCELLED";

/**
 * Links the mock "sent" before the demo started, one per state, listed in the
 * Mailbox panel. Tokens are as long as real ones and only ever in the URL path.
 */
export const DEMO_EMAIL_TOKENS: {
  token: string;
  kind: "VERIFY" | "CHANGE" | "RESET";
  account: string;
  state: DemoEmailTokenState;
}[] = [
  {
    token: "demo-verify-daudi-valid-4Fq8Zr2LmN7xPw",
    kind: "VERIFY",
    account: "daudi@example.com",
    state: "VALID",
  },
  {
    token: "demo-verify-juma-expired-9Kd3Vt6QsB1yHc",
    kind: "VERIFY",
    account: "juma@example.com",
    state: "EXPIRED",
  },
  {
    token: "demo-verify-neema-used-2Wp5Gx8RnJ4mLa",
    kind: "VERIFY",
    account: "neema@example.com",
    state: "USED",
  },
  {
    token: "demo-change-saida-valid-7Ht1Ye4UkC9vXb",
    kind: "CHANGE",
    account: "saida@example.com",
    state: "VALID",
  },
  {
    token: "demo-reset-neema-cancelled-3Lr6Ds9FqZ2nTw",
    kind: "RESET",
    account: "neema@example.com",
    state: "CANCELLED",
  },
  {
    token: "demo-reset-neema-valid-8Mv2Ka5PxQ7cRe",
    kind: "RESET",
    account: "neema@example.com",
    state: "VALID",
  },
  {
    token: "demo-reset-baraka-expired-5Nb9Wc2GtV6hJs",
    kind: "RESET",
    account: "baraka@example.com",
    state: "EXPIRED",
  },
  {
    token: "demo-reset-rehema-used-1Qz4Xf7BdK3pMy",
    kind: "RESET",
    account: "rehema@example.com",
    state: "USED",
  },
];
