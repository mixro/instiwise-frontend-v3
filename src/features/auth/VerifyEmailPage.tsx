import { CalendarX, CircleCheck, MailCheck, SearchX, UserX, type LucideIcon } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";
import { EmptyState } from "@/components/EmptyState";
import { FormAlert } from "@/components/FormAlert";
import { Button } from "@/components/ui/Button";
import { ROLE_HOME } from "@/features/shell/navigation";
import { StandalonePage } from "@/features/shell/StandalonePage";
import { useErrorText } from "@/hooks/useErrorText";
import { useNoReferrer } from "@/hooks/useNoReferrer";
import { useSession } from "@/hooks/useSession";
import { ApiError } from "@/lib/api";
import { confirmEmail, resendVerification, type EmailVerified } from "./api";
import { AuthCard } from "./AuthCard";
import { useRefreshMe } from "./queries";
import { ResendButton } from "./ResendButton";
import { ResendByEmailForm } from "./ResendByEmailForm";
import { formatWait } from "./wait";

const TOKEN = /^[A-Za-z0-9_-]{32,128}$/;

type Problem = "invalid" | "expired" | "used" | "taken";

const PROBLEMS: Record<Problem, { icon: LucideIcon; tone: "neutral" | "danger" }> = {
  invalid: { icon: SearchX, tone: "danger" },
  expired: { icon: CalendarX, tone: "danger" },
  used: { icon: CircleCheck, tone: "neutral" },
  taken: { icon: UserX, tone: "danger" },
};

function problemOf(error: unknown): Problem | undefined {
  if (!(error instanceof ApiError)) return undefined;
  switch (error.code) {
    case "VERIFICATION_TOKEN_INVALID":
      return "invalid";
    case "VERIFICATION_TOKEN_EXPIRED":
      return "expired";
    case "EMAIL_ALREADY_VERIFIED":
      return "used";
    case "EMAIL_TAKEN":
      return "taken";
    default:
      return undefined;
  }
}

/**
 * /verify-email/:token, signed in or not (ADR 0006). Opening the page sends
 * nothing: mail scanners open links, so only the Confirm button verifies.
 */
export function VerifyEmailPage() {
  const { t } = useTranslation();
  const { apiError } = useErrorText();
  const { user, signIn } = useSession();
  const refreshMe = useRefreshMe();
  const raw = useParams().token ?? "";
  const token = TOKEN.test(raw) ? raw : null;
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<EmailVerified>();
  const [problem, setProblem] = useState<Problem | undefined>(token ? undefined : "invalid");
  const [formError, setFormError] = useState<string>();
  useNoReferrer();

  async function confirm() {
    if (!token) return;
    setPending(true);
    setFormError(undefined);
    try {
      const verified = await confirmEmail(token);
      setResult(verified);
      // A confirmed change is the new sign-in address of whoever is signed in here.
      if (user && verified.changed && user.email) signIn({ ...user, email: verified.email });
      void refreshMe();
    } catch (error) {
      const reason = problemOf(error);
      if (reason) setProblem(reason);
      else if (error instanceof ApiError && error.code === "RATE_LIMITED") {
        setFormError(
          t("auth.forgot.limited", { time: formatWait(error.retryAfterSeconds ?? 60, t) }),
        );
      } else setFormError(apiError(error));
    } finally {
      setPending(false);
    }
  }

  const onward = user ? (
    <Button asChild variant="primary">
      <Link to={ROLE_HOME[user.role]}>{t("auth.verify.continue")}</Link>
    </Button>
  ) : (
    <Button asChild variant="primary">
      <Link to="/login">{t("auth.verify.signIn")}</Link>
    </Button>
  );

  if (result) {
    return (
      <StandalonePage>
        <EmptyState
          titleAs="h1"
          icon={MailCheck}
          title={t("auth.verify.doneTitle")}
          description={
            result.changed
              ? t("auth.verify.doneChanged", { email: result.email })
              : t("auth.verify.doneBody", { email: result.email })
          }
          action={onward}
        />
      </StandalonePage>
    );
  }

  if (problem) {
    const { icon, tone } = PROBLEMS[problem];
    return (
      <StandalonePage>
        <EmptyState
          titleAs="h1"
          icon={icon}
          tone={tone}
          title={t(`auth.verify.states.${problem}.title`)}
          description={t(`auth.verify.states.${problem}.body`)}
          action={
            problem === "expired" ? (
              user ? (
                <ResendButton send={resendVerification} />
              ) : (
                <ResendByEmailForm />
              )
            ) : (
              onward
            )
          }
        />
      </StandalonePage>
    );
  }

  return (
    <AuthCard title={t("auth.verify.title")} description={t("auth.verify.body")}>
      {formError && <FormAlert>{formError}</FormAlert>}
      <Button variant="primary" className="w-full" loading={pending} onClick={() => void confirm()}>
        {pending ? t("auth.verify.confirming") : t("auth.verify.confirm")}
      </Button>
    </AuthCard>
  );
}
