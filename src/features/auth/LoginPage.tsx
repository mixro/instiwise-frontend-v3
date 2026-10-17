import { zodResolver } from "@hookform/resolvers/zod";
import { Suspense, useState } from "react";
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
import { AuthCard } from "./AuthCard";
import { TextLink } from "./TextLink";
import { login } from "./api";
import { DemoHints } from "./demo-hints";
import { loginSchema, type LoginValues } from "./schemas";

export function LoginPage() {
  const { t } = useTranslation();
  const { fieldError, apiError } = useErrorText();
  const { signIn } = useSession();
  const navigate = useNavigate();
  const [formError, setFormError] = useState<string>();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    // First check on submit, then live as fields change. Validating on blur shifted the
    // layout under the pointer and swallowed the first click on the submit button.
    mode: "onSubmit",
    reValidateMode: "onChange",
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: LoginValues) {
    setFormError(undefined);
    try {
      const { user } = await login(values);
      // GuestOnly then moves them on (to where they were going, or their home).
      signIn({ role: user.role, name: user.name });
    } catch (error) {
      if (error instanceof ApiError && error.code === "ACCOUNT_PENDING_APPROVAL") {
        navigate("/pending-approval");
        return;
      }
      setFormError(apiError(error));
    }
  }

  return (
    <AuthCard
      title={t("auth.login.title")}
      description={t("auth.login.subtitle")}
      footer={
        <>
          {t("auth.login.haveInvitation")}{" "}
          <TextLink to="/invite">{t("auth.login.enterCode")}</TextLink>
        </>
      }
      after={
        DemoHints && (
          <Suspense fallback={null}>
            <DemoHints show="accounts" />
          </Suspense>
        )
      }
    >
      <form noValidate onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {formError && <FormAlert>{formError}</FormAlert>}
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
        <FormField label={t("auth.fields.password")} error={fieldError(errors.password?.message)}>
          {(control) => (
            <PasswordInput autoComplete="current-password" {...control} {...register("password")} />
          )}
        </FormField>
        <Button type="submit" variant="primary" loading={isSubmitting} className="w-full">
          {isSubmitting ? t("auth.login.submitting") : t("auth.login.submit")}
        </Button>
      </form>
    </AuthCard>
  );
}
