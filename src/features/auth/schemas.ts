import { z } from "zod";
import { parseInvitationInput, parseResetCodeInput } from "@/lib/invitation-code";
import { normalizeTzPhone } from "@/lib/phone";

/*
 * Form schemas. Messages are translation keys (validation.*); FormField shows
 * them through t(), so every message exists in English and Swahili.
 *
 * Decided by the product owner (2026-10-17, brief open question 1):
 * - Client registration: name, email, password required; phone optional.
 * - Operator registration: name, phone, email, password; an admin approves.
 * - Sign-in is by email.
 * - Passwords: at least 8 characters with at least one letter and one number.
 * The server validates everything again; these checks are for quick feedback.
 */

export const PASSWORD_MIN_LENGTH = 8;

export const nameField = z
  .string()
  .trim()
  .min(2, "validation.nameRequired")
  .max(100, "validation.nameTooLong");

const email = z
  .string()
  .trim()
  .min(1, "validation.emailRequired")
  .max(254, "validation.emailInvalid")
  .pipe(z.email("validation.emailInvalid"));

export const newPassword = z
  .string()
  .min(1, "validation.passwordRequired")
  .min(PASSWORD_MIN_LENGTH, "validation.passwordTooShort")
  .max(128, "validation.passwordTooLong")
  .regex(/\p{L}/u, "validation.passwordNeedsLetter")
  .regex(/\d/, "validation.passwordNeedsNumber");

export const requiredPhone = z
  .string()
  .trim()
  .min(1, "validation.phoneRequired")
  .refine((value) => value === "" || normalizeTzPhone(value) !== null, "validation.phoneInvalid");

export const optionalPhoneField = z
  .string()
  .trim()
  .refine((value) => value === "" || normalizeTzPhone(value) !== null, "validation.phoneInvalid");

export const loginSchema = z.object({
  email,
  // No rules on sign-in: never hint at what a valid password looks like.
  password: z.string().min(1, "validation.passwordRequired"),
});

export const invitationEntrySchema = z.object({
  invitation: z
    .string()
    .trim()
    .min(1, "validation.invitationRequired")
    .refine(
      (value) => value === "" || parseInvitationInput(value) !== null,
      "validation.invitationFormat",
    ),
});

/** /reset: the code an admin sent, or the whole link (ADR 0005). */
export const resetEntrySchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, "validation.resetCodeRequired")
    .refine(
      (value) => value === "" || parseResetCodeInput(value) !== null,
      "validation.resetCodeFormat",
    ),
});

export const clientRegistrationSchema = z.object({
  name: nameField,
  email,
  phone: optionalPhoneField,
  password: newPassword,
});

export const operatorRegistrationSchema = z.object({
  name: nameField,
  phone: requiredPhone,
  email,
  password: newPassword,
});

// Run each rule even while other fields still have errors, so all show at once.
const always = { when: () => true };

/** Changing the password while signed in (decided 2026-10-21). */
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "validation.currentPasswordRequired"),
    newPassword,
    confirmPassword: z.string(),
  })
  .refine((values) => values.confirmPassword === values.newPassword, {
    message: "validation.passwordsDiffer",
    path: ["confirmPassword"],
    ...always,
  })
  .refine((values) => !values.currentPassword || values.newPassword !== values.currentPassword, {
    message: "validation.passwordSame",
    path: ["newPassword"],
    ...always,
  });

/** /reset/:code: a new password under the registration rules, typed twice. */
export const resetPasswordSchema = z
  .object({
    password: newPassword,
    confirmPassword: z.string().min(1, "validation.confirmPasswordRequired"),
  })
  .refine((values) => !values.confirmPassword || values.confirmPassword === values.password, {
    message: "validation.passwordsDiffer",
    path: ["confirmPassword"],
    ...always,
  });

/** /forgot-password, and asking for a new confirmation link while signed out (ADR 0006). */
export const emailOnlySchema = z.object({ email });

/** A new sign-in address (pending until confirmed) and the current password. */
export function emailChangeSchema(currentEmail: string) {
  return z.object({
    newEmail: email.refine(
      (value) => value.toLowerCase() !== currentEmail.toLowerCase(),
      "validation.newEmailSame",
    ),
    currentPassword: z.string().min(1, "validation.currentPasswordRequired"),
  });
}

export type LoginValues = z.infer<typeof loginSchema>;
export type ChangePasswordValues = z.infer<typeof changePasswordSchema>;
export type EmailOnlyValues = z.infer<typeof emailOnlySchema>;
export type EmailChangeValues = z.infer<ReturnType<typeof emailChangeSchema>>;
export type ResetEntryValues = z.infer<typeof resetEntrySchema>;
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;
export type InvitationEntryValues = z.infer<typeof invitationEntrySchema>;
export type ClientRegistrationValues = z.infer<typeof clientRegistrationSchema>;
export type OperatorRegistrationValues = z.infer<typeof operatorRegistrationSchema>;
