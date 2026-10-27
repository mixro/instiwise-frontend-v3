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
/** What checking a reset code reveals: that it works, and until when. Nothing about the account. */
export type ResetCodeCheck = Schema<"ResetCodeCheck">;
/** Returned once to the admin who issues a code; never again. */
export type ResetCodeIssued = Schema<"ResetCodeIssued">;
/** An account's active reset code, without the code; null when none (ADR 0005). */
export type ResetCodeStatus = Schema<"ResetCodeStatus">;

export const RESET_CODE_ERROR_CODES = [
  "RESET_CODE_NOT_FOUND",
  "RESET_CODE_EXPIRED",
  "RESET_CODE_CANCELLED",
  "RESET_CODE_ALREADY_USED",
  "RESET_CODE_LOCKED",
] as const satisfies readonly Schema<"ErrorCode">[];

export type ResetCodeErrorCode = (typeof RESET_CODE_ERROR_CODES)[number];

export function isResetCodeErrorCode(code: string): code is ResetCodeErrorCode {
  return (RESET_CODE_ERROR_CODES as readonly string[]).includes(code);
}

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

export const getResetCode = (code: string) =>
  apiClient.GET("/auth/reset-codes/{code}", { path: { code } });

// ----- Email verification and reset by email (ADR 0006) -----

export type VerificationSent = Schema<"VerificationSent">;
export type EmailVerified = Schema<"EmailVerified">;

export const RESET_TOKEN_ERROR_CODES = [
  "RESET_TOKEN_INVALID",
  "RESET_TOKEN_EXPIRED",
  "RESET_TOKEN_USED",
  "RESET_TOKEN_CANCELLED",
] as const satisfies readonly Schema<"ErrorCode">[];

export type ResetTokenErrorCode = (typeof RESET_TOKEN_ERROR_CODES)[number];

export function isResetTokenErrorCode(code: string): code is ResetTokenErrorCode {
  return (RESET_TOKEN_ERROR_CODES as readonly string[]).includes(code);
}

/** The signed-in user, with emailVerified and pendingEmail (the banner asks this). */
export const getMe = () => apiClient.GET("/auth/me");

/** Always 202 with no body, for any address (never reveals an account). */
export const requestPasswordReset = (email: string) =>
  apiClient.POST("/auth/password-reset-requests", { body: { email } });

export const getPasswordReset = (token: string) =>
  apiClient.GET("/auth/password-resets/{token}", { path: { token } });

/** Changes the password and signs out every session (204). Does not sign in. */
export const completeEmailPasswordReset = (token: string, password: string) =>
  apiClient.POST("/auth/password-resets/{token}/completion", {
    path: { token },
    body: { password },
  });

/** Signed in: a new link to the pending or unverified address. */
export const resendVerification = () => apiClient.POST("/auth/email-verification");

/** Signed out (e.g. an operator waiting for approval): always 202, for any address. */
export const requestVerificationEmail = (email: string) =>
  apiClient.POST("/auth/email-verification-requests", { body: { email } });

/** The Confirm button; opening /verify-email/<token> alone never calls this. */
export const confirmEmail = (token: string) =>
  apiClient.POST("/auth/email-verifications/{token}", { path: { token } });

export const requestEmailChange = (body: Schema<"EmailChangeRequest">) =>
  apiClient.POST("/auth/email-change", { body });

export const cancelEmailChange = () => apiClient.POST("/auth/email-change/cancellation");

/** Sets the new password (204). Does not sign in: the user signs in afterwards. */
export const completePasswordReset = (code: string, password: string) =>
  apiClient.POST("/auth/reset-codes/{code}/completion", { path: { code }, body: { password } });
