import { useState } from "react";
import { useTranslation } from "react-i18next";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { MoneyCell } from "@/components/MoneyCell";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/Button";
import { useErrorText } from "@/hooks/useErrorText";
import { formatTzPhone } from "@/lib/phone";
import type { AdminClient } from "./api";
import { AssignDialog } from "./AssignDialog";
import { useAdminClients, useAdminOperators } from "./queries";

/** Every client, who works with them, and what they owe. Assign or reassign here. */
export function AdminClientsPage() {
  const { t } = useTranslation();
  const { apiError } = useErrorText();
  const clients = useAdminClients();
  const operators = useAdminOperators();
  const [assigning, setAssigning] = useState<AdminClient | null>(null);

  const activeOperators = (operators.data ?? []).filter((o) => o.status === "ACTIVE");

  const columns: DataTableColumn<AdminClient>[] = [
    {
      id: "name",
      header: t("operator.clients.name"),
      cell: (client) => (
        <span>
          <span className="block font-medium">{client.name}</span>
          <span className="block text-xs text-muted">{client.email}</span>
        </span>
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
      id: "operator",
      header: t("roles.OPERATOR"),
      cell: (client) =>
        client.operator ? (
          client.operator.name
        ) : (
          <span className="inline-flex h-6 items-center rounded-md bg-warning-bg px-2 text-xs font-medium text-warning-fg">
            {t("admin.clients.unassigned")}
          </span>
        ),
      sortValue: (client) => client.operator?.name ?? "",
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
    {
      id: "actions",
      header: t("admin.actions"),
      cell: (client) => (
        <Button size="sm" onClick={() => setAssigning(client)}>
          {client.operator ? t("admin.clients.reassign") : t("admin.clients.assign")}
          <span className="sr-only"> {client.name}</span>
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title={t("nav.admin.clients")} description={t("admin.clients.subtitle")} />
      <DataTable
        caption={t("nav.admin.clients")}
        columns={columns}
        rows={clients.data ?? []}
        rowKey={(client) => client.id}
        loading={clients.isPending}
        error={clients.isError ? apiError(clients.error) : undefined}
        onRetry={() => void clients.refetch()}
        defaultSort={{ columnId: "name", direction: "asc" }}
        empty={{ title: t("admin.clients.empty"), description: t("admin.clients.emptyBody") }}
      />
      {assigning && (
        <AssignDialog
          open
          onOpenChange={(open) => !open && setAssigning(null)}
          title={t("admin.assign.clientTitle", { name: assigning.name })}
          description={
            assigning.operator
              ? t("admin.assign.clientNow", { name: assigning.operator.name })
              : t("admin.assign.clientNone")
          }
          fieldLabel={t("roles.OPERATOR")}
          options={activeOperators
            .filter((operator) => operator.id !== assigning.operator?.id)
            .map((operator) => ({
              id: operator.id,
              label: operator.name,
              note: t("admin.assign.clientCount", { count: operator.clients.length }),
            }))}
          pair={(operatorId) => [assigning.id, operatorId]}
          successMessage={(operator) =>
            t("admin.assign.done", { client: assigning.name, operator: operator.label })
          }
        />
      )}
    </div>
  );
}
