import { UserCog } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { useErrorText } from "@/hooks/useErrorText";
import { useLanguage } from "@/hooks/useLanguage";
import { useToast } from "@/hooks/useToast";
import { formatDate } from "@/lib/format";
import { formatTzPhone } from "@/lib/phone";
import { OPERATOR_STATUSES, type OperatorStatus } from "@/lib/status";
import { adminApi, type AdminOperator } from "./api";
import { AssignDialog } from "./AssignDialog";
import { useAdminClients, useAdminOperators, useRefreshAll } from "./queries";

type Action = "approve" | "reject" | "suspend" | "reactivate";

const NEEDS_REASON: Action[] = ["reject", "suspend"];

function OperatorCard({ operator }: { operator: AdminOperator }) {
  const { t } = useTranslation();
  const language = useLanguage();
  const { apiError } = useErrorText();
  const { toast } = useToast();
  const refresh = useRefreshAll();
  const clients = useAdminClients();
  const [action, setAction] = useState<Action | null>(null);
  const [assigning, setAssigning] = useState(false);
  const [error, setError] = useState<string>();
  const hasClients = operator.clients.length > 0;

  async function run(chosen: Action, reason?: string) {
    setError(undefined);
    try {
      await adminApi.operatorAction(operator.id, chosen, reason);
    } catch (failure) {
      setError(apiError(failure));
      throw failure;
    }
    toast({
      variant: "success",
      title: t(`admin.operators.done.${chosen}`, { name: operator.name }),
    });
    void refresh();
  }

  return (
    <li className="space-y-3 rounded-lg border border-border bg-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="font-semibold">{operator.name}</h2>
          <p className="text-sm text-muted">
            {operator.email} · {formatTzPhone(operator.phone)}
          </p>
          <p className="text-xs text-muted">
            {t("admin.operators.registered", { date: formatDate(operator.registeredAt, language) })}
          </p>
        </div>
        <StatusBadge kind="operator" status={operator.status} />
      </div>

      {operator.reason && (
        <p className="text-sm">
          <span className="text-muted">{t("admin.operators.reason")}</span> {operator.reason}
        </p>
      )}

      {operator.status === "ACTIVE" && (
        <div className="text-sm">
          <p className="text-muted">
            {t("admin.operators.clients", { count: operator.clients.length })}
          </p>
          {hasClients && (
            <ul className="mt-1 flex flex-wrap gap-2">
              {operator.clients.map((client) => (
                <li
                  key={client.id}
                  className="rounded-md border border-border px-2 py-1 text-xs font-medium"
                >
                  {client.name}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {operator.status === "PENDING_APPROVAL" && (
          <>
            <Button variant="primary" onClick={() => setAction("approve")}>
              {t("admin.operators.approve")}
            </Button>
            <Button onClick={() => setAction("reject")}>{t("admin.operators.reject")}</Button>
          </>
        )}
        {operator.status === "ACTIVE" && (
          <>
            <Button onClick={() => setAssigning(true)}>{t("admin.operators.assign")}</Button>
            <Button onClick={() => setAction("suspend")} disabled={hasClients}>
              {t("admin.operators.suspend")}
            </Button>
          </>
        )}
        {operator.status === "SUSPENDED" && (
          <Button onClick={() => setAction("reactivate")}>{t("admin.operators.reactivate")}</Button>
        )}
      </div>
      {operator.status === "ACTIVE" && hasClients && (
        <p className="text-xs text-muted">
          {t("admin.operators.reassignFirst", { count: operator.clients.length })}{" "}
          <Link to="/admin/clients" className="font-medium text-brand-text underline">
            {t("nav.admin.clients")}
          </Link>
        </p>
      )}

      {action && (
        <ConfirmDialog
          open
          onOpenChange={(open) => {
            if (!open) {
              setAction(null);
              setError(undefined);
            }
          }}
          tone={action === "reject" || action === "suspend" ? "danger" : "default"}
          title={t(`admin.operators.confirm.${action}.title`, { name: operator.name })}
          description={t(`admin.operators.confirm.${action}.body`, { name: operator.name })}
          confirmLabel={t(`admin.operators.${action}`)}
          reason={
            NEEDS_REASON.includes(action)
              ? { label: t("admin.operators.reasonLabel"), hint: t("changes.admin.reasonHint") }
              : undefined
          }
          error={error}
          onConfirm={(reason) => run(action, reason)}
        />
      )}

      {assigning && (
        <AssignDialog
          open
          onOpenChange={setAssigning}
          title={t("admin.assign.operatorTitle", { name: operator.name })}
          description={t("admin.assign.operatorBody")}
          fieldLabel={t("operator.payments.client")}
          options={(clients.data ?? [])
            .filter((client) => client.operator?.id !== operator.id)
            .map((client) => ({
              id: client.id,
              label: client.name,
              note: client.operator
                ? t("admin.assign.nowWith", { name: client.operator.name })
                : t("admin.clients.unassigned"),
            }))}
          pair={(clientId) => [clientId, operator.id]}
          successMessage={(client) =>
            t("admin.assign.done", { client: client.label, operator: operator.name })
          }
        />
      )}
    </li>
  );
}

/** Approve, reject, suspend and reactivate operators, and give them clients. */
export function AdminOperatorsPage() {
  const { t } = useTranslation();
  const operators = useAdminOperators();
  const [tab, setTab] = useState<OperatorStatus>("PENDING_APPROVAL");

  const count = (status: OperatorStatus) =>
    (operators.data ?? []).filter((o) => o.status === status).length;

  return (
    <div className="space-y-6">
      <PageHeader title={t("nav.admin.operators")} description={t("admin.operators.subtitle")} />

      {operators.isPending && (
        <div aria-busy="true" className="space-y-2">
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-32 w-full rounded-lg" />
          <Skeleton className="h-32 w-full rounded-lg" />
        </div>
      )}
      {operators.isError && (
        <ErrorState error={operators.error} onRetry={() => void operators.refetch()} />
      )}

      {operators.data && (
        <Tabs value={tab} onValueChange={(value) => setTab(value as OperatorStatus)}>
          <TabsList aria-label={t("admin.operators.byStatus")}>
            {OPERATOR_STATUSES.map((status) => (
              <TabsTrigger key={status} value={status}>
                {t(`status.operator.${status}`)} ({count(status)})
              </TabsTrigger>
            ))}
          </TabsList>
          <TabsContent value={tab}>
            {count(tab) === 0 ? (
              <EmptyState icon={UserCog} title={t(`admin.operators.empty.${tab}`)} />
            ) : (
              <ul className="space-y-2">
                {operators.data
                  .filter((operator) => operator.status === tab)
                  .map((operator) => (
                    <OperatorCard key={operator.id} operator={operator} />
                  ))}
              </ul>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
