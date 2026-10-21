import { useId, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Label } from "@/components/ui/Label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { useErrorText } from "@/hooks/useErrorText";
import { INVITATION_STATUSES, type InvitationStatus } from "@/lib/status";
import { invitationsApi, type AdminInvitationFilters } from "./api";
import { InvitationsTable } from "./InvitationsTable";
import { useAdminInvitations } from "./queries";

const ALL = "all";

/** Every invitation, filtered on the server by status and by who sent it. */
export function AdminInvitations() {
  const { t } = useTranslation();
  const { apiError } = useErrorText();
  const ids = { status: useId(), inviter: useId() };
  const [filters, setFilters] = useState<AdminInvitationFilters>({});
  const invitations = useAdminInvitations(filters);
  // Everyone who has sent an invitation, for the filter (from the unfiltered list).
  const everyone = useAdminInvitations({});
  const inviters = useMemo(() => {
    const byId = new Map<string, string>();
    for (const invitation of everyone.data ?? []) {
      byId.set(invitation.inviter.id, invitation.inviter.name);
    }
    return [...byId].sort((a, b) => a[1].localeCompare(b[1]));
  }, [everyone.data]);
  const filtered = Boolean(filters.status || filters.inviterId);

  return (
    <section aria-labelledby="all-invitations" className="space-y-3">
      <div>
        <h2 id="all-invitations" className="text-lg font-semibold">
          {t("invitations.all.title")}
        </h2>
        <p className="text-sm text-muted">{t("invitations.all.body")}</p>
      </div>

      <div
        role="group"
        aria-label={t("invitations.filters.title")}
        className="grid gap-4 rounded-lg border border-border bg-surface p-4 sm:grid-cols-2"
      >
        <div className="flex flex-col gap-2">
          <Label htmlFor={ids.status}>{t("invitations.filters.status")}</Label>
          <Select
            value={filters.status ?? ALL}
            onValueChange={(value) =>
              setFilters((f) => ({
                ...f,
                status: value === ALL ? undefined : (value as InvitationStatus),
              }))
            }
          >
            <SelectTrigger id={ids.status}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t("invitations.filters.allStatuses")}</SelectItem>
              {INVITATION_STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {t(`status.invitation.${status}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor={ids.inviter}>{t("invitations.filters.inviter")}</Label>
          <Select
            value={filters.inviterId ?? ALL}
            onValueChange={(value) =>
              setFilters((f) => ({ ...f, inviterId: value === ALL ? undefined : value }))
            }
          >
            <SelectTrigger id={ids.inviter}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t("invitations.filters.everyone")}</SelectItem>
              {inviters.map(([id, name]) => (
                <SelectItem key={id} value={id}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <InvitationsTable
        caption={t("invitations.all.title")}
        rows={invitations.data ?? []}
        loading={invitations.isPending}
        error={invitations.isError ? apiError(invitations.error) : undefined}
        onRetry={() => void invitations.refetch()}
        empty={
          filtered
            ? { title: t("invitations.all.noMatches") }
            : { title: t("invitations.all.empty"), description: t("invitations.all.emptyBody") }
        }
        showInviter
        revoke={invitationsApi.admin.revoke}
      />
    </section>
  );
}
