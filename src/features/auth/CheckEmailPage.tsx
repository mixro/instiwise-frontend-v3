import { MailCheck } from "lucide-react";
import { Suspense } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router-dom";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/Button";
import { ROLE_HOME } from "@/features/shell/navigation";
import { StandalonePage } from "@/features/shell/StandalonePage";
import { useSession } from "@/hooks/useSession";
import { requestVerificationEmail } from "./api";
import { MailboxHint } from "./mailbox-hint";
import { ResendButton } from "./ResendButton";
import { ResendByEmailForm } from "./ResendByEmailForm";

/** What registration hands over (in history state, never in the URL). */
export interface CheckEmailState {
  email: string;
  /** An operator waits for an admin as well. */
  pendingApproval?: boolean;
}

function readState(value: unknown): CheckEmailState | null {
  const state = value as Partial<CheckEmailState> | null;
  return typeof state?.email === "string"
    ? { email: state.email, pendingApproval: state.pendingApproval === true }
    : null;
}

/**
 * /check-email, after registration (ADR 0006): where the confirmation link went,
 * with "Resend email". Clients are already signed in and can carry on; operators
 * also wait for an admin's approval.
 */
export function CheckEmailPage() {
  const { t } = useTranslation();
  const { user } = useSession();
  const state = readState(useLocation().state);

  return (
    <StandalonePage>
      <EmptyState
        titleAs="h1"
        icon={MailCheck}
        title={t("auth.checkEmail.title")}
        description={
          state
            ? t("auth.checkEmail.body", { email: state.email })
            : t("auth.checkEmail.bodyNoEmail")
        }
        action={
          <div className="flex w-full max-w-sm flex-col items-center gap-4">
            {state?.pendingApproval && (
              <p className="text-sm text-muted">{t("auth.checkEmail.operatorNote")}</p>
            )}
            {user && !state?.pendingApproval && (
              <p className="text-sm text-muted">{t("auth.checkEmail.clientNote")}</p>
            )}
            <p className="text-sm text-muted">{t("auth.checkEmail.spam")}</p>
            {state ? (
              <ResendButton send={() => requestVerificationEmail(state.email)} />
            ) : (
              <ResendByEmailForm />
            )}
            <Button asChild variant="primary">
              {user ? (
                <Link to={ROLE_HOME[user.role]}>{t("auth.checkEmail.continue")}</Link>
              ) : (
                <Link to="/login">{t("auth.checkEmail.backToSignIn")}</Link>
              )}
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
