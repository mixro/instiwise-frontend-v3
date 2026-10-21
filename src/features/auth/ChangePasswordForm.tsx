import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { FormAlert } from "@/components/FormAlert";
import { FormField } from "@/components/FormField";
import { PasswordInput } from "@/components/PasswordInput";
import { Button } from "@/components/ui/Button";
import { useErrorText } from "@/hooks/useErrorText";
import { useToast } from "@/hooks/useToast";
import { ApiError } from "@/lib/api";
import { changePassword } from "./api";
import { changePasswordSchema, type ChangePasswordValues } from "./schemas";

/**
 * Change the password while signed in (decided 2026-10-21). The server checks
 * the current one and signs every other device out; this one stays signed in.
 */
export function ChangePasswordForm() {
  const { t } = useTranslation();
  const { fieldError, apiError } = useErrorText();
  const { toast } = useToast();
  const [formError, setFormError] = useState<string>();

  const {
    register,
    handleSubmit,
    reset,
    setError,
    setFocus,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    mode: "onSubmit",
    reValidateMode: "onChange",
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  async function onSubmit(values: ChangePasswordValues) {
    setFormError(undefined);
    try {
      await changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      reset();
      toast({ variant: "success", title: t("operator.profile.password.done") });
    } catch (error) {
      if (error instanceof ApiError && error.code === "CURRENT_PASSWORD_WRONG") {
        setError("currentPassword", { message: "apiErrors.CURRENT_PASSWORD_WRONG" });
        setFocus("currentPassword");
        return;
      }
      setFormError(apiError(error));
    }
  }

  return (
    <form noValidate onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <p className="text-sm text-muted">{t("operator.profile.password.note")}</p>
      {formError && <FormAlert>{formError}</FormAlert>}
      <FormField
        label={t("operator.profile.password.current")}
        error={fieldError(errors.currentPassword?.message)}
      >
        {(control) => (
          <PasswordInput
            autoComplete="current-password"
            {...control}
            {...register("currentPassword")}
          />
        )}
      </FormField>
      <FormField
        label={t("operator.profile.password.new")}
        hint={t("auth.password.rule")}
        error={fieldError(errors.newPassword?.message)}
      >
        {(control) => (
          <PasswordInput autoComplete="new-password" {...control} {...register("newPassword")} />
        )}
      </FormField>
      <FormField
        label={t("operator.profile.password.confirm")}
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
      <Button type="submit" variant="primary" loading={isSubmitting} className="w-full sm:w-auto">
        {isSubmitting
          ? t("operator.profile.password.submitting")
          : t("operator.profile.password.submit")}
      </Button>
    </form>
  );
}
