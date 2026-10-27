import { zodResolver } from "@hookform/resolvers/zod";
import { Clock } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { VerifiedTag } from "@/components/VerifiedTag";
import { FormAlert } from "@/components/FormAlert";
import { FormField } from "@/components/FormField";
import { PasswordInput } from "@/components/PasswordInput";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useErrorText } from "@/hooks/useErrorText";
import { useToast } from "@/hooks/useToast";
import { ApiError } from "@/lib/api";
import { cancelEmailChange, requestEmailChange, resendVerification } from "./api";
import { useRefreshMe } from "./queries";
import { ResendButton } from "./ResendButton";
import { emailChangeSchema, type EmailChangeValues } from "./schemas";
import { formatWait } from "./wait";

interface EmailSettingsProps {
  email: string;
  emailVerified: boolean;
  pendingEmail: string | null;
  /** Reload the profile after a change or a cancellation. */
  onChanged: () => void;
}

/**
 * The sign-in email on Account (clients) and Profile (operators), ADR 0006:
 * verified or not; a new address waits for confirmation while the old one keeps
 * working; a pending change can be cancelled.
 */
export function EmailSettings({
  email,
  emailVerified,
  pendingEmail,
  onChanged,
}: EmailSettingsProps) {
  const { t } = useTranslation();
  const { fieldError, apiError } = useErrorText();
  const { toast } = useToast();
  const refreshMe = useRefreshMe();
  const [changing, setChanging] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string>();
  const [formError, setFormError] = useState<string>();

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<EmailChangeValues>({
    resolver: zodResolver(emailChangeSchema(email)),
    mode: "onSubmit",
    reValidateMode: "onChange",
    defaultValues: { newEmail: "", currentPassword: "" },
  });

  function changed() {
    onChanged();
    void refreshMe();
  }

  async function onSubmit(values: EmailChangeValues) {
    setFormError(undefined);
    try {
      const sent = await requestEmailChange({
        newEmail: values.newEmail.trim(),
        currentPassword: values.currentPassword,
      });
      toast({ variant: "success", title: t("auth.email.requested", { email: sent.sentTo }) });
      reset();
      setChanging(false);
      changed();
    } catch (error) {
      if (error instanceof ApiError && error.code === "CURRENT_PASSWORD_WRONG") {
        setError(
          "currentPassword",
          { message: "apiErrors.CURRENT_PASSWORD_WRONG" },
          { shouldFocus: true },
        );
      } else if (error instanceof ApiError && error.code === "EMAIL_TAKEN") {
        setError("newEmail", { message: "apiErrors.EMAIL_TAKEN" }, { shouldFocus: true });
      } else if (error instanceof ApiError && error.code === "RATE_LIMITED") {
        setFormError(
          t("auth.resend.limited", { time: formatWait(error.retryAfterSeconds ?? 60, t) }),
        );
      } else {
        setFormError(apiError(error));
      }
    }
  }

  async function cancel() {
    setCancelError(undefined);
    try {
      await cancelEmailChange();
    } catch (error) {
      setCancelError(apiError(error));
      throw error;
    }
    toast({ variant: "success", title: t("auth.email.cancelled") });
    changed();
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <p className="text-sm text-muted">{t("auth.email.current")}</p>
        <p className="flex flex-wrap items-center gap-2 font-medium break-all">
          {email}
          <VerifiedTag
            verified={emailVerified}
            label={emailVerified ? t("auth.email.verified") : t("auth.email.notVerified")}
          />
        </p>
        {!emailVerified && !pendingEmail && (
          <div className="space-y-2 pt-1">
            <p className="text-sm text-muted">{t("auth.email.notVerifiedBody")}</p>
            <ResendButton size="sm" send={resendVerification} />
          </div>
        )}
      </div>

      {pendingEmail ? (
        <div className="space-y-3 rounded-lg border border-border bg-surface-muted p-4">
          <p className="flex items-center gap-2 font-medium">
            <Clock className="size-4 shrink-0 text-warning-fg" aria-hidden="true" />
            {t("auth.email.pendingTitle")}
          </p>
          <p className="text-sm break-words">
            {t("auth.email.pendingBody", { email: pendingEmail, current: email })}
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
            <ResendButton size="sm" send={resendVerification} />
            <Button size="sm" variant="danger" onClick={() => setCancelling(true)}>
              {t("auth.email.cancel")}
            </Button>
          </div>
        </div>
      ) : changing ? (
        <form noValidate onSubmit={handleSubmit(onSubmit)} className="max-w-md space-y-4">
          {formError && <FormAlert>{formError}</FormAlert>}
          <FormField label={t("auth.email.newEmail")} error={fieldError(errors.newEmail?.message)}>
            {(control) => (
              <Input
                type="email"
                inputMode="email"
                autoComplete="email"
                autoCapitalize="none"
                {...control}
                {...register("newEmail")}
              />
            )}
          </FormField>
          <FormField
            label={t("auth.email.password")}
            hint={t("auth.email.passwordHint")}
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
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button
              type="button"
              disabled={isSubmitting}
              onClick={() => {
                reset();
                setFormError(undefined);
                setChanging(false);
              }}
            >
              {t("ui.cancel")}
            </Button>
            <Button type="submit" variant="primary" loading={isSubmitting}>
              {t("auth.email.submit")}
            </Button>
          </div>
        </form>
      ) : (
        <Button onClick={() => setChanging(true)} className="w-full sm:w-auto">
          {t("auth.email.change")}
        </Button>
      )}

      <ConfirmDialog
        open={cancelling}
        onOpenChange={(open) => {
          setCancelling(open);
          if (!open) setCancelError(undefined);
        }}
        tone="danger"
        title={t("auth.email.cancelTitle", { email: pendingEmail ?? "" })}
        description={t("auth.email.cancelBody", { current: email })}
        confirmLabel={t("auth.email.cancel")}
        error={cancelError}
        onConfirm={cancel}
      />
    </div>
  );
}
