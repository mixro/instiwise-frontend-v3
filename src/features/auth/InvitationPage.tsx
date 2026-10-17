import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import { FormAlert } from "@/components/FormAlert";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { useErrorText } from "@/hooks/useErrorText";
import { useLanguage } from "@/hooks/useLanguage";
import { ApiError } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { parseInvitationInput } from "@/lib/invitation-code";
import { AuthCard } from "./AuthCard";
import { InvitationProblem } from "./InvitationProblem";
import { RegistrationForm } from "./RegistrationForm";
import { getInvitation, isInvitationErrorCode, type InvitationErrorCode } from "./api";

/** /invite/:code: check the invitation, then show the right registration form or what went wrong. */
export function InvitationPage() {
  const { t } = useTranslation();
  const language = useLanguage();
  const { apiError } = useErrorText();
  const code = parseInvitationInput(useParams().code ?? "");
  const [problem, setProblem] = useState<InvitationErrorCode>();

  const invitation = useQuery({
    queryKey: ["invitation", code],
    queryFn: () => getInvitation(code ?? ""),
    enabled: code !== null,
    retry: false,
    // Always ask the server: an invitation can be used or revoked at any moment.
    gcTime: 0,
  });

  if (code === null) return <InvitationProblem code="INVITATION_NOT_FOUND" />;
  if (problem) return <InvitationProblem code={problem} />;

  if (invitation.isPending) {
    return (
      <AuthCard title={t("auth.invite.checking")}>
        <div aria-busy="true" className="space-y-4">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-12 w-full rounded-lg sm:h-10" />
          <Skeleton className="h-12 w-full rounded-lg sm:h-10" />
        </div>
      </AuthCard>
    );
  }

  if (invitation.isError) {
    const { error } = invitation;
    if (error instanceof ApiError && isInvitationErrorCode(error.code)) {
      return <InvitationProblem code={error.code} />;
    }
    return (
      <AuthCard title={t("auth.invite.loadFailed")}>
        <FormAlert>{apiError(error)}</FormAlert>
        <Button variant="primary" className="w-full" onClick={() => void invitation.refetch()}>
          {t("ui.retry")}
        </Button>
      </AuthCard>
    );
  }

  const { role, inviterName, expiresAt } = invitation.data;
  const isOperator = role === "OPERATOR";

  return (
    <AuthCard
      title={isOperator ? t("auth.register.operatorTitle") : t("auth.register.clientTitle")}
      description={
        <>
          <p>
            {isOperator
              ? t("auth.invite.context.operator", { inviter: inviterName })
              : t("auth.invite.context.client", { inviter: inviterName })}
          </p>
          <p>{t("auth.invite.context.expires", { date: formatDate(expiresAt, language) })}</p>
        </>
      }
    >
      <RegistrationForm invitation={invitation.data} onInvitationProblem={setProblem} />
    </AuthCard>
  );
}
