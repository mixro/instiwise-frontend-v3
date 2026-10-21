import { UserPlus } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { ErrorState } from "@/components/ErrorState";
import { MoneyCell } from "@/components/MoneyCell";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/Button";
import { InviteDialog } from "@/features/invitations/InviteDialog";
import { OperatorInvitations } from "@/features/invitations/OperatorInvitations";
import { useMayInviteClients } from "@/features/invitations/useMayInvite";
import { formatTzPhone } from "@/lib/phone";
import type { ClientSummary } from "./api";
import { useOperatorClients } from "./queries";

/**
 * Clients assigned to the signed-in operator, and nobody else. Operators an admin
 * allowed to invite also get "Invite client" and their own invitations here.
 */
export function OperatorClientsPage() {
  const { t } = useTranslation();
  const clients = useOperatorClients();
  const mayInvite = useMayInviteClients();
  const [inviting, setInviting] = useState(false);

  const columns: DataTableColumn<ClientSummary>[] = [
    {
      id: "name",
      header: t("operator.clients.name"),
      cell: (client) => (
        <Link
          to={`/operator/clients/${client.id}`}
          className="inline-flex min-h-11 items-center font-medium text-brand-text underline underline-offset-4 hover:no-underline sm:min-h-0"
        >
          {client.name}
        </Link>
      ),
      sortValue: (client) => client.name,
      mobile: "title",
    },
    {
      id: "phone",
      header: t("auth.fields.phone"),
      cell: (client) => (client.phone ? formatTzPhone(client.phone) : "—"),
    },
    {
      id: "projects",
      header: t("operator.clients.projects"),
      cell: (client) => client.projectCount,
      sortValue: (client) => client.projectCount,
      numeric: true,
    },
    {
      id: "outstanding",
      header: t("client.money.outstanding"),
      cell: (client) => <MoneyCell amount={client.balance} />,
      sortValue: (client) => client.balance,
      numeric: true,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("nav.operator.clients")}
        description={t("operator.clients.subtitle")}
        actions={
          mayInvite && (
            <Button variant="primary" onClick={() => setInviting(true)}>
              <UserPlus className="size-4" aria-hidden="true" />
              {t("invitations.invite")}
            </Button>
          )
        }
      />
      {clients.isError ? (
        <ErrorState error={clients.error} onRetry={() => void clients.refetch()} />
      ) : (
        <DataTable
          caption={t("nav.operator.clients")}
          columns={columns}
          rows={clients.data ?? []}
          rowKey={(client) => client.id}
          loading={clients.isPending}
          defaultSort={{ columnId: "name", direction: "asc" }}
          empty={{ title: t("operator.clients.empty") }}
        />
      )}
      {mayInvite && (
        <>
          <OperatorInvitations />
          <InviteDialog open={inviting} onOpenChange={setInviting} mode="operator" />
        </>
      )}
    </div>
  );
}
