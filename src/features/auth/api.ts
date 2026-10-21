import { apiClient } from "@/lib/api";
import type { Schema } from "@/lib/contract/types";

/*
 * Auth endpoints. Shapes and error codes come from contracts/openapi.yaml
 * (tag Auth); src/mocks/auth.ts serves them until the backend exists.
 */

export type AuthUser = Schema<"AuthUser">;
export type Session = Schema<"Session">;
/** What an invitation reveals before sign-in: no client or project data. */
export type Invitation = Schema<"Invitation">;
export type InvitedRole = Invitation["role"];
export type RegistrationResult = Schema<"RegistrationResult">;
export type RegistrationBody = Schema<"RegistrationRequest">;

export const INVITATION_ERROR_CODES = [
  "INVITATION_NOT_FOUND",
  "INVITATION_EXPIRED",
  "INVITATION_REVOKED",
  "INVITATION_ALREADY_USED",
] as const satisfies readonly Schema<"ErrorCode">[];

export type InvitationErrorCode = (typeof INVITATION_ERROR_CODES)[number];

export function isInvitationErrorCode(code: string): code is InvitationErrorCode {
  return (INVITATION_ERROR_CODES as readonly string[]).includes(code);
}

export const login = (body: Schema<"LoginRequest">) => apiClient.POST("/auth/login", { body });

/** Signed in: needs the current password; other devices are signed out (204). */
export const changePassword = (body: Schema<"ChangePasswordRequest">) =>
  apiClient.POST("/auth/password", { body });

export const getInvitation = (code: string) =>
  apiClient.GET("/invitations/{code}", { path: { code } });

export const register = (code: string, body: RegistrationBody) =>
  apiClient.POST("/invitations/{code}/registrations", { path: { code }, body });
