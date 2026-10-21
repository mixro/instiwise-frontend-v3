import { useTranslation } from "react-i18next";
import { useErrorText } from "@/hooks/useErrorText";
import { invitationsApi } from "./api";
import { InvitationsTable } from "./InvitationsTable";
import { useOperatorInvitations } from "./queries";

/** The operator's own invitations. Only rendered for an operator who may invite. */
export function OperatorInvitations() {
  const { t } = useTranslation();
  const { apiError } = useErrorText();
  const invitations = useOperatorInvitations(true);

  return (
    <section aria-labelledby="my-invitations" className="space-y-3">
      <div>
        <h2 id="my-invitations" className="text-lg font-semibold">
          {t("invitations.mine.title")}
        </h2>
        <p className="text-sm text-muted">{t("invitations.mine.body")}</p>
      </div>
      <InvitationsTable
        caption={t("invitations.mine.title")}
        rows={invitations.data ?? []}
        loading={invitations.isPending}
        error={invitations.isError ? apiError(invitations.error) : undefined}
        onRetry={() => void invitations.refetch()}
        empty={{ title: t("invitations.mine.empty"), description: t("invitations.mine.emptyBody") }}
        revoke={invitationsApi.operator.revoke}
      />
    </section>
  );
}
