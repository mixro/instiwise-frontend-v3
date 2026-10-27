import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { FormAlert } from "@/components/FormAlert";
import { FormField } from "@/components/FormField";
import { PasswordInput } from "@/components/PasswordInput";
import { Button } from "@/components/ui/Button";
import { useErrorText } from "@/hooks/useErrorText";
import { resetPasswordSchema, type ResetPasswordValues } from "./schemas";

interface NewPasswordFormProps {
  /** Sends the new password; the page shows what happens next. */
  onSubmit: (password: string) => Promise<void>;
  /** Translated error above the form (e.g. the server refused the password). */
  error?: string;
}

/** A new password under the registration rules, typed twice, each with show/hide. */
export function NewPasswordForm({ onSubmit, error }: NewPasswordFormProps) {
  const { t } = useTranslation();
  const { fieldError } = useErrorText();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    mode: "onSubmit",
    reValidateMode: "onChange",
    defaultValues: { password: "", confirmPassword: "" },
  });

  return (
    <form
      noValidate
      onSubmit={handleSubmit(({ password }) => onSubmit(password))}
      className="space-y-4"
    >
      {error && <FormAlert>{error}</FormAlert>}
      <FormField
        label={t("auth.reset.password")}
        hint={t("auth.password.rule")}
        error={fieldError(errors.password?.message)}
      >
        {(control) => (
          <PasswordInput autoComplete="new-password" {...control} {...register("password")} />
        )}
      </FormField>
      <FormField
        label={t("auth.reset.confirm")}
        error={fieldError(errors.confirmPassword?.message)}
      >
        {(control) => (
          <PasswordInput
            autoComplete="new-password"
            {...control}
            {...register("confirmPassword")}
          />
        )}
      </FormField>
      <Button type="submit" variant="primary" loading={isSubmitting} className="w-full">
        {isSubmitting ? t("auth.reset.saving") : t("auth.reset.save")}
      </Button>
    </form>
  );
}
