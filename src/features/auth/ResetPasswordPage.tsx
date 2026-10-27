import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import { FormAlert } from "@/components/FormAlert";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { useErrorText } from "@/hooks/useErrorText";
import { useLanguage } from "@/hooks/useLanguage";
import { useNoReferrer } from "@/hooks/useNoReferrer";
import { ApiError } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import { parseResetCodeInput } from "@/lib/invitation-code";
import { AuthCard } from "./AuthCard";
import { completePasswordReset, getResetCode, isResetCodeErrorCode } from "./api";
import { NewPasswordForm } from "./NewPasswordForm";
import { PasswordChanged } from "./PasswordChanged";
import { ResetCodeProblem, type ResetProblem } from "./ResetCodeProblem";

/** The reason a reset code cannot be used, if the error is one of those. */
function problemOf(error: unknown): ResetProblem | undefined {
  if (!(error instanceof ApiError)) return undefined;
  if (error.code === "RATE_LIMITED") return "RATE_LIMITED";
  return isResetCodeErrorCode(error.code) ? error.code : undefined;
}

/**
 * /reset/:code: check the code, then a new password typed twice. Shows nothing
 * about the account before or after (ADR 0005), and does not sign in: the
 * person signs in with the new password, under the usual rules.
 */
export function ResetPasswordPage() {
  const { t } = useTranslation();
  const language = useLanguage();
  const { apiError } = useErrorText();
  const code = parseResetCodeInput(useParams().code ?? "");
  const [problem, setProblem] = useState<ResetProblem>();
  const [formError, setFormError] = useState<string>();
  const [done, setDone] = useState(false);
  useNoReferrer();

  const check = useQuery({
    queryKey: ["reset-code", code],
    queryFn: () => getResetCode(code ?? ""),
    enabled: code !== null && !done,
    retry: false,
    // Always ask the server: a code can be used, cancelled or replaced at any moment.
    gcTime: 0,
  });

  async function submit(password: string) {
    if (!code) return;
    setFormError(undefined);
    try {
      await completePasswordReset(code, password);
      setDone(true);
    } catch (error) {
      const reason = problemOf(error);
      if (reason) setProblem(reason);
      else setFormError(apiError(error));
    }
  }

  if (done) return <PasswordChanged />;
  if (code === null) return <ResetCodeProblem problem="RESET_CODE_NOT_FOUND" />;
  if (problem) {
    return (
      <ResetCodeProblem
        problem={problem}
        onRetry={() => {
          setProblem(undefined);
          void check.refetch();
        }}
      />
    );
  }

  if (check.isPending) {
    return (
      <AuthCard title={t("auth.reset.checking")}>
        <div aria-busy="true" className="space-y-4">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-12 w-full rounded-lg sm:h-10" />
          <Skeleton className="h-12 w-full rounded-lg sm:h-10" />
        </div>
      </AuthCard>
    );
  }

  if (check.isError) {
    const reason = problemOf(check.error);
    if (reason) {
      return <ResetCodeProblem problem={reason} onRetry={() => void check.refetch()} />;
    }
    return (
      <AuthCard title={t("auth.reset.loadFailed")}>
        <FormAlert>{apiError(check.error)}</FormAlert>
        <Button variant="primary" className="w-full" onClick={() => void check.refetch()}>
          {t("ui.retry")}
        </Button>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title={t("auth.reset.formTitle")}
      description={
        <>
          <p>{t("auth.reset.expires", { date: formatDateTime(check.data.expiresAt, language) })}</p>
          <p>{t("auth.reset.signedOut")}</p>
        </>
      }
    >
      <NewPasswordForm onSubmit={submit} error={formError} />
    </AuthCard>
  );
}
