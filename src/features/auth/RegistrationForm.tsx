import { zodResolver } from "@hookform/resolvers/zod";
import { startTransition, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { FormAlert } from "@/components/FormAlert";
import { FormField } from "@/components/FormField";
import { PasswordInput } from "@/components/PasswordInput";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useErrorText } from "@/hooks/useErrorText";
import { useSession } from "@/hooks/useSession";
import { ApiError } from "@/lib/api";
import { normalizeTzPhone } from "@/lib/phone";
import type { CheckEmailState } from "./CheckEmailPage";
import {
  isInvitationErrorCode,
  register as registerAccount,
  type Invitation,
  type InvitationErrorCode,
} from "./api";
import {
  clientRegistrationSchema,
  operatorRegistrationSchema,
  type ClientRegistrationValues,
} from "./schemas";

// Both forms have the same fields; only the rules (phone optional or required) differ.
type Values = ClientRegistrationValues;

interface RegistrationFormProps {
  invitation: Invitation;
  /** The invitation stopped being valid while the form was open. */
  onInvitationProblem: (code: InvitationErrorCode) => void;
}

/** Client: signed in straight away. Operator: waits for an admin's approval. */
export function RegistrationForm({ invitation, onInvitationProblem }: RegistrationFormProps) {
  const { t, i18n } = useTranslation();
  const { fieldError, apiError } = useErrorText();
  const { signIn } = useSession();
  const navigate = useNavigate();
  const [formError, setFormError] = useState<string>();
  const isOperator = invitation.role === "OPERATOR";

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(isOperator ? operatorRegistrationSchema : clientRegistrationSchema),
    // First check on submit, then live as fields change. Validating on blur shifted the
    // layout under the pointer and swallowed the first click on the submit button.
    mode: "onSubmit",
    reValidateMode: "onChange",
    defaultValues: { name: "", email: "", phone: "", password: "" },
  });

  async function onSubmit(values: Values) {
    setFormError(undefined);
    try {
      const result = await registerAccount(invitation.code, {
        name: values.name,
        email: values.email,
        phone: normalizeTzPhone(values.phone) ?? undefined,
        password: values.password,
        // Saved with the account; the confirmation email is written in it (ADR 0006).
        preferredLanguage: i18n.language === "sw" ? "sw" : "en",
      });
      const email = values.email.trim();
      if (result.status === "ACTIVE") {
        // Signed in, then "check your email". One transition, so this sign-in page's
        // GuestOnly never sends them home first.
        startTransition(() => {
          signIn({ role: result.user.role, name: result.user.name, email: result.user.email });
          navigate("/check-email", { replace: true, state: { email } satisfies CheckEmailState });
        });
      } else {
        navigate("/check-email", {
          replace: true,
          state: { email, pendingApproval: true } satisfies CheckEmailState,
        });
      }
    } catch (error) {
      if (error instanceof ApiError && error.code === "EMAIL_TAKEN") {
        setError("email", { message: "apiErrors.EMAIL_TAKEN" }, { shouldFocus: true });
        return;
      }
      if (error instanceof ApiError && isInvitationErrorCode(error.code)) {
        onInvitationProblem(error.code);
        return;
      }
      setFormError(apiError(error));
    }
  }

  return (
    <form noValidate onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {formError && <FormAlert>{formError}</FormAlert>}
      <FormField label={t("auth.fields.name")} error={fieldError(errors.name?.message)}>
        {(control) => <Input autoComplete="name" {...control} {...register("name")} />}
      </FormField>
      <FormField label={t("auth.fields.email")} error={fieldError(errors.email?.message)}>
        {(control) => (
          <Input
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            {...control}
            {...register("email")}
          />
        )}
      </FormField>
      <FormField
        label={t("auth.fields.phone")}
        hint={isOperator ? t("auth.register.phoneHint") : t("auth.register.clientPhoneHint")}
        optional={!isOperator}
        error={fieldError(errors.phone?.message)}
      >
        {(control) => (
          <Input
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            {...control}
            {...register("phone")}
          />
        )}
      </FormField>
      <FormField
        label={t("auth.register.password")}
        hint={t("auth.password.rule")}
        error={fieldError(errors.password?.message)}
      >
        {(control) => (
          <PasswordInput autoComplete="new-password" {...control} {...register("password")} />
        )}
      </FormField>
      {isOperator && <p className="text-sm text-muted">{t("auth.register.approvalNote")}</p>}
      <Button type="submit" variant="primary" loading={isSubmitting} className="w-full">
        {isSubmitting ? t("auth.register.submitting") : t("auth.register.submit")}
      </Button>
    </form>
  );
}
