import { api, postJson } from "@/lib/api";
import type { Role } from "@/lib/roles";

/*
 * Auth endpoints. Served by src/mocks/auth.ts until the backend exists; the
 * shapes go into contracts/openapi.yaml in phase 3.1.
 *
 * Error codes the screens handle:
 *   POST /auth/login                  INVALID_CREDENTIALS, ACCOUNT_PENDING_APPROVAL,
 *                                     ACCOUNT_REJECTED, ACCOUNT_SUSPENDED, RATE_LIMITED
 *   GET  /invitations/{code}          INVITATION_NOT_FOUND, INVITATION_EXPIRED,
 *                                     INVITATION_REVOKED, INVITATION_ALREADY_USED
 *   POST /invitations/{code}/registrations
 *                                     the invitation codes above, EMAIL_TAKEN, VALIDATION_FAILED
 */

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export type InvitedRole = Extract<Role, "CLIENT" | "OPERATOR">;

/** What an invitation reveals before sign-in: no client or project data. */
export interface Invitation {
  code: string;
  role: InvitedRole;
  inviterName: string;
  expiresAt: string;
}

export type RegistrationResult =
  { status: "ACTIVE"; user: AuthUser } | { status: "PENDING_APPROVAL" };

export interface RegistrationBody {
  name: string;
  email: string;
  /** +255XXXXXXXXX, or omitted (clients only). */
  phone?: string;
  password: string;
}

export const INVITATION_ERROR_CODES = [
  "INVITATION_NOT_FOUND",
  "INVITATION_EXPIRED",
  "INVITATION_REVOKED",
  "INVITATION_ALREADY_USED",
] as const;

export type InvitationErrorCode = (typeof INVITATION_ERROR_CODES)[number];

export function isInvitationErrorCode(code: string): code is InvitationErrorCode {
  return (INVITATION_ERROR_CODES as readonly string[]).includes(code);
}

export const login = (body: { email: string; password: string }) =>
  postJson<{ user: AuthUser }>("/auth/login", body);

export const getInvitation = (code: string) =>
  api<Invitation>(`/invitations/${encodeURIComponent(code)}`);

export const register = (code: string, body: RegistrationBody) =>
  postJson<RegistrationResult>(`/invitations/${encodeURIComponent(code)}/registrations`, body);
