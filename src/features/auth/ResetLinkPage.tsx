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
import { AuthCard } from "./AuthCard";
import { completeEmailPasswordReset, getPasswordReset, isResetTokenErrorCode } from "./api";
import { NewPasswordForm } from "./NewPasswordForm";
import { PasswordChanged } from "./PasswordChanged";
import { ResetLinkProblem, type ResetLinkIssue } from "./ResetLinkProblem";

const TOKEN = /^[A-Za-z0-9_-]{32,128}$/;

function issueOf(error: unknown): ResetLinkIssue | undefined {
  if (!(error instanceof ApiError)) return undefined;
  if (error.code === "RATE_LIMITED") return "RATE_LIMITED";
  return isResetTokenErrorCode(error.code) ? error.code : undefined;
}

/**
 * /reset-password/:token, from the reset email (ADR 0006): check the link, then
 * a new password typed twice. Completing it signs out every session and leads
 * to sign in; nothing about the account is shown at any point.
 */
export function ResetLinkPage() {
  const { t } = useTranslation();
  const language = useLanguage();
  const { apiError } = useErrorText();
  const raw = useParams().token ?? "";
  const token = TOKEN.test(raw) ? raw : null;
  const [issue, setIssue] = useState<ResetLinkIssue>();
  const [formError, setFormError] = useState<string>();
  const [done, setDone] = useState(false);
  useNoReferrer();

  const check = useQuery({
    // Not keyed by the token: it stays out of caches and devtools.
    queryKey: ["password-reset-link"],
    queryFn: () => getPasswordReset(token ?? ""),
    enabled: token !== null && !done,
    retry: false,
    gcTime: 0,
  });

  async function submit(password: string) {
    if (!token) return;
    setFormError(undefined);
    try {
      await completeEmailPasswordReset(token, password);
      setDone(true);
    } catch (error) {
      const reason = issueOf(error);
      if (reason) setIssue(reason);
      else setFormError(apiError(error));
    }
  }

  if (done) return <PasswordChanged />;
  if (token === null) return <ResetLinkProblem issue="RESET_TOKEN_INVALID" />;
  if (issue) {
    return (
      <ResetLinkProblem
        issue={issue}
        onRetry={() => {
          setIssue(undefined);
          void check.refetch();
        }}
      />
    );
  }

  if (check.isPending) {
    return (
      <AuthCard title={t("auth.resetLink.checking")}>
        <div aria-busy="true" className="space-y-4">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-12 w-full rounded-lg sm:h-10" />
          <Skeleton className="h-12 w-full rounded-lg sm:h-10" />
        </div>
      </AuthCard>
    );
  }

  if (check.isError) {
    const reason = issueOf(check.error);
    if (reason) return <ResetLinkProblem issue={reason} onRetry={() => void check.refetch()} />;
    return (
      <AuthCard title={t("auth.resetLink.loadFailed")}>
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
          <p>
            {t("auth.resetLink.expires", {
              time: formatDateTime(check.data.expiresAt, language),
            })}
          </p>
          <p>{t("auth.resetLink.signedOut")}</p>
        </>
      }
    >
      <NewPasswordForm onSubmit={submit} error={formError} />
    </AuthCard>
  );
}
