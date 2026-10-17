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
