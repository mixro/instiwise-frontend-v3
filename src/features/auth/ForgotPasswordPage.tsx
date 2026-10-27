import { zodResolver } from "@hookform/resolvers/zod";
import { MailCheck } from "lucide-react";
import { Suspense, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { EmptyState } from "@/components/EmptyState";
import { FormAlert } from "@/components/FormAlert";
import { FormField } from "@/components/FormField";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { StandalonePage } from "@/features/shell/StandalonePage";
import { useErrorText } from "@/hooks/useErrorText";
import { ApiError } from "@/lib/api";
import { AuthCard } from "./AuthCard";
import { requestPasswordReset } from "./api";
import { MailboxHint } from "./mailbox-hint";
import { emailOnlySchema, type EmailOnlyValues } from "./schemas";
import { TextLink } from "./TextLink";
import { formatWait } from "./wait";

/**
 * /forgot-password (ADR 0006): one email field. The answer is the same for every
 * address (known, unknown, unverified, suspended), so nothing about accounts is
 * revealed. Admin-issued reset codes stay available as a fallback.
 */
export function ForgotPasswordPage() {
  const { t } = useTranslation();
  const { fieldError, apiError } = useErrorText();
  const [sentTo, setSentTo] = useState<string>();
  const [formError, setFormError] = useState<string>();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EmailOnlyValues>({
    resolver: zodResolver(emailOnlySchema),
    mode: "onSubmit",
    reValidateMode: "onChange",
    defaultValues: { email: "" },
  });

  async function onSubmit({ email }: EmailOnlyValues) {
    setFormError(undefined);
    try {
      await requestPasswordReset(email);
      setSentTo(email);
    } catch (error) {
      setFormError(
        error instanceof ApiError && error.code === "RATE_LIMITED"
          ? t("auth.forgot.limited", { time: formatWait(error.retryAfterSeconds ?? 60, t) })
          : apiError(error),
      );
    }
  }

  if (sentTo) {
    return (
      <StandalonePage>
        <EmptyState
          titleAs="h1"
          icon={MailCheck}
          title={t("auth.forgot.sentTitle")}
          description={t("auth.forgot.sentBody", { email: sentTo })}
          action={
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button asChild variant="primary">
                <Link to="/login">{t("auth.forgot.backToSignIn")}</Link>
              </Button>
              <Button
                onClick={() => {
                  reset({ email: "" });
                  setSentTo(undefined);
                }}
              >
                {t("auth.forgot.again")}
              </Button>
            </div>
          }
        />
        {MailboxHint && (
          <Suspense fallback={null}>
            <MailboxHint />
          </Suspense>
        )}
      </StandalonePage>
    );
  }

  return (
    <AuthCard
      title={t("auth.forgot.title")}
      description={t("auth.forgot.body")}
      footer={
        <div className="space-y-1">
          <p>
            <TextLink to="/login">{t("auth.forgot.backToSignIn")}</TextLink>
          </p>
          <p>
            {t("auth.forgot.haveCode")}{" "}
            <TextLink to="/reset">{t("auth.forgot.enterCode")}</TextLink>
          </p>
        </div>
      }
    >
      <form noValidate onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {formError && <FormAlert>{formError}</FormAlert>}
        <FormField label={t("auth.forgot.field")} error={fieldError(errors.email?.message)}>
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
        <Button type="submit" variant="primary" loading={isSubmitting} className="w-full">
          {isSubmitting ? t("auth.forgot.sending") : t("auth.forgot.submit")}
        </Button>
      </form>
    </AuthCard>
  );
}
