import { describe, expect, it } from "vitest";
import enCommon from "@/i18n/locales/en/common.json";
import swCommon from "@/i18n/locales/sw/common.json";
import {
  clientRegistrationSchema,
  invitationEntrySchema,
  loginSchema,
  operatorRegistrationSchema,
  resetEntrySchema,
  resetPasswordSchema,
} from "./schemas";

const VALID = {
  name: "Amani Kweka",
  email: "amani@example.com",
  phone: "0754 321 987",
  password: "mradi2026",
};

/** The first message per field, as the form shows it. */
function firstErrors(result: {
  success: boolean;
  error?: { issues: { path: PropertyKey[]; message: string }[] };
}) {
  const errors: Record<string, string> = {};
  for (const issue of result.error?.issues ?? []) {
    const field = String(issue.path[0]);
    errors[field] ??= issue.message;
  }
  return errors;
}

describe("registration schemas", () => {
  it("accepts a complete client and a complete operator", () => {
    expect(clientRegistrationSchema.safeParse(VALID).success).toBe(true);
    expect(operatorRegistrationSchema.safeParse(VALID).success).toBe(true);
  });

  it("lets clients leave the phone empty but not operators", () => {
    const withoutPhone = { ...VALID, phone: "" };
    expect(clientRegistrationSchema.safeParse(withoutPhone).success).toBe(true);
    expect(firstErrors(operatorRegistrationSchema.safeParse(withoutPhone))).toEqual({
      phone: "validation.phoneRequired",
    });
  });

  it("checks a phone number when one is given", () => {
    expect(firstErrors(clientRegistrationSchema.safeParse({ ...VALID, phone: "12345" }))).toEqual({
      phone: "validation.phoneInvalid",
    });
  });

  it.each([
    ["", "validation.passwordRequired"],
    ["abc123", "validation.passwordTooShort"],
    ["12345678", "validation.passwordNeedsLetter"],
    ["mradiwangu", "validation.passwordNeedsNumber"],
    ["a1".repeat(65), "validation.passwordTooLong"],
  ])("explains why %j is not a valid password", (password, message) => {
    expect(firstErrors(clientRegistrationSchema.safeParse({ ...VALID, password }))).toEqual({
      password: message,
    });
  });

  it("requires a name and a well-formed email", () => {
    expect(
      firstErrors(clientRegistrationSchema.safeParse({ ...VALID, name: " ", email: "amani@" })),
    ).toEqual({ name: "validation.nameRequired", email: "validation.emailInvalid" });
  });
});

describe("login and invitation schemas", () => {
  it("only asks for something in the password on sign-in", () => {
    expect(loginSchema.safeParse({ email: "neema@example.com", password: "x" }).success).toBe(true);
    expect(firstErrors(loginSchema.safeParse({ email: "", password: "" }))).toEqual({
      email: "validation.emailRequired",
      password: "validation.passwordRequired",
    });
  });

  it("accepts a link or a code, and explains anything else", () => {
    expect(invitationEntrySchema.safeParse({ invitation: "kx7p m4q2" }).success).toBe(true);
    expect(firstErrors(invitationEntrySchema.safeParse({ invitation: "" }))).toEqual({
      invitation: "validation.invitationRequired",
    });
    expect(firstErrors(invitationEntrySchema.safeParse({ invitation: "hello" }))).toEqual({
      invitation: "validation.invitationFormat",
    });
  });
});

describe("password reset schemas", () => {
  it("accept a reset link or code, and explain anything else", () => {
    expect(resetEntrySchema.safeParse({ code: "https://x.tz/reset/r7km-2qxp" }).success).toBe(true);
    expect(firstErrors(resetEntrySchema.safeParse({ code: "" }))).toEqual({
      code: "validation.resetCodeRequired",
    });
    expect(firstErrors(resetEntrySchema.safeParse({ code: "hello" }))).toEqual({
      code: "validation.resetCodeFormat",
    });
  });

  it("apply the registration rules and ask for the same password twice", () => {
    expect(
      resetPasswordSchema.safeParse({ password: "Mpya2026", confirmPassword: "Mpya2026" }).success,
    ).toBe(true);
    expect(
      firstErrors(resetPasswordSchema.safeParse({ password: "abc123", confirmPassword: "" })),
    ).toEqual({
      password: "validation.passwordTooShort",
      confirmPassword: "validation.confirmPasswordRequired",
    });
    expect(
      firstErrors(
        resetPasswordSchema.safeParse({ password: "Mpya2026", confirmPassword: "Mpya2027" }),
      ),
    ).toEqual({ confirmPassword: "validation.passwordsDiffer" });
  });
});

describe("validation messages", () => {
  it("exist in English and Swahili for every key the schemas use", () => {
    const source = [
      clientRegistrationSchema,
      operatorRegistrationSchema,
      loginSchema,
      resetEntrySchema,
      resetPasswordSchema,
    ]
      .map((schema) => JSON.stringify(schema.def))
      .join();
    const used = new Set(source.match(/validation\.\w+/g));
    for (const key of used) {
      const name = key.replace("validation.", "") as keyof typeof enCommon.validation;
      expect(enCommon.validation[name], key).toBeTruthy();
      expect(swCommon.validation[name], key).toBeTruthy();
    }
  });
});
