import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/Button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";
import { useErrorText } from "@/hooks/useErrorText";
import { useLanguage } from "@/hooks/useLanguage";
import { useToast } from "@/hooks/useToast";
import { formatDate } from "@/lib/format";
import type { StaffInvitation } from "./api";
import { InvitationShare } from "./InvitationShare";
import { useShareIntro } from "./useShareIntro";
import { useRefreshInvitations } from "./queries";

interface InvitationsTableProps {
  caption: string;
  rows: StaffInvitation[];
  loading?: boolean;
  error?: string;
  onRetry?: () => void;
  empty: { title: string; description?: string; action?: ReactNode };
  /** Admin list: who sent each one, and its role. */
  showInviter?: boolean;
  /** Calls the right revoke endpoint for the signed-in role. */
  revoke: (code: string) => Promise<StaffInvitation>;
}

/** Invitations with their state; pending ones can be shared again or revoked. */
export function InvitationsTable({
  caption,
  rows,
  loading,
  error,
  onRetry,
  empty,
  showInviter = false,
  revoke,
}: InvitationsTableProps) {
  const { t } = useTranslation();
  const language = useLanguage();
  const { apiError } = useErrorText();
  const { toast } = useToast();
  const refresh = useRefreshInvitations();
  const [sharing, setSharing] = useState<StaffInvitation | null>(null);
  const [revoking, setRevoking] = useState<StaffInvitation | null>(null);
  const [revokeError, setRevokeError] = useState<string>();
  const shareIntro = useShareIntro(sharing);

  async function confirmRevoke() {
    if (!revoking) return;
    setRevokeError(undefined);
    try {
      await revoke(revoking.code);
      toast({ variant: "success", title: t("invitations.revoke.done", { code: revoking.code }) });
      await refresh();
    } catch (failure) {
      setRevokeError(apiError(failure));
      throw failure;
    }
  }

  function detail(invitation: StaffInvitation): string | null {
    if (invitation.status === "ACCEPTED" || invitation.status === "REJECTED") {
      return invitation.acceptedBy
        ? t("invitations.usedBy", { name: invitation.acceptedBy })
        : null;
    }
    if (invitation.status === "REVOKED" && invitation.revokedBy) {
      return t("invitations.revokedBy", { name: invitation.revokedBy });
    }
    return null;
  }

  const columns: DataTableColumn<StaffInvitation>[] = [
    {
      id: "who",
      header: t("invitations.columns.who"),
      cell: (invitation) => (
        <span>
          <span className="block font-medium">
            {invitation.label ?? (
              <span className="font-normal text-muted">{t("invitations.noLabel")}</span>
            )}
          </span>
          {showInviter && (
            <span className="block text-xs text-muted">
              {t(`invitations.roleTag.${invitation.role}`)}
              {invitation.operator &&
                ` · ${t("invitations.assignedTo", { name: invitation.operator.name })}`}
            </span>
          )}
        </span>
      ),
      sortValue: (invitation) => invitation.label ?? "",
      mobile: "title",
    },
    {
      id: "code",
      header: t("invitations.columns.code"),
      cell: (invitation) => <span className="font-mono">{invitation.code}</span>,
    },
    {
      id: "status",
      header: t("invitations.columns.status"),
      cell: (invitation) => (
        <span className="flex flex-col items-start gap-1">
          <StatusBadge kind="invitation" status={invitation.status} />
          {detail(invitation) && <span className="text-xs text-muted">{detail(invitation)}</span>}
        </span>
      ),
      sortValue: (invitation) => invitation.status,
    },
    {
      id: "expires",
      header: t("invitations.columns.expires"),
      cell: (invitation) => (
        <time dateTime={invitation.expiresAt} className="whitespace-nowrap">
          {formatDate(invitation.expiresAt, language)}
        </time>
      ),
      sortValue: (invitation) => invitation.expiresAt,
    },
    ...(showInviter
      ? [
          {
            id: "inviter",
            header: t("invitations.columns.inviter"),
            cell: (invitation: StaffInvitation) => (
              <span>
                <span className="block">{invitation.inviter.name}</span>
                <span className="block text-xs text-muted">
                  {t(`roles.${invitation.inviter.role}`)}
                </span>
              </span>
            ),
            sortValue: (invitation: StaffInvitation) => invitation.inviter.name,
          },
        ]
      : []),
    {
      id: "actions",
      header: t("invitations.columns.actions"),
      cell: (invitation) =>
        invitation.status === "PENDING" ? (
          <span className="inline-flex gap-2">
            <Button size="sm" onClick={() => setSharing(invitation)}>
              {t("invitations.share.again")}
              <span className="sr-only"> {invitation.code}</span>
            </Button>
            <Button size="sm" variant="danger" onClick={() => setRevoking(invitation)}>
              {t("invitations.revoke.action")}
              <span className="sr-only"> {invitation.code}</span>
            </Button>
          </span>
        ) : (
          <span className="text-muted">—</span>
        ),
    },
  ];

  return (
    <>
      <DataTable
        caption={caption}
        columns={columns}
        rows={rows}
        rowKey={(invitation) => invitation.code}
        loading={loading}
        error={error}
        onRetry={onRetry}
        empty={empty}
      />

      <Dialog open={sharing !== null} onOpenChange={(open) => !open && setSharing(null)}>
        <DialogContent>
          {sharing && (
            <>
              <DialogHeader>
                <DialogTitle>
                  {t("invitations.share.titleAgain", { code: sharing.code })}
                </DialogTitle>
                <DialogDescription>{shareIntro}</DialogDescription>
              </DialogHeader>
              <InvitationShare invitation={sharing} />
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="primary">{t("invitations.share.done")}</Button>
                </DialogClose>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={revoking !== null}
        onOpenChange={(open) => {
          if (!open) {
            setRevoking(null);
            setRevokeError(undefined);
          }
        }}
        title={t("invitations.revoke.title", { code: revoking?.code ?? "" })}
        description={t("invitations.revoke.body")}
        confirmLabel={t("invitations.revoke.confirm")}
        tone="danger"
        error={revokeError}
        onConfirm={confirmRevoke}
      />
    </>
  );
}
