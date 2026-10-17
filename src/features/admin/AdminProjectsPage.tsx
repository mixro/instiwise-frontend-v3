import { ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { MoneyCell } from "@/components/MoneyCell";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { useAdminQueue } from "@/features/changes/queries";
import { useErrorText } from "@/hooks/useErrorText";
import { useLanguage } from "@/hooks/useLanguage";
import { formatDate } from "@/lib/format";
import type { AdminProject } from "./api";
import { useAdminProjects } from "./queries";

/** Every project in the system, plus the price/deadline changes waiting for an admin. */
export function AdminProjectsPage() {
  const { t } = useTranslation();
  const language = useLanguage();
  const { apiError } = useErrorText();
  const projects = useAdminProjects();
  const queue = useAdminQueue();

  const columns: DataTableColumn<AdminProject>[] = [
    {
      id: "title",
      header: t("client.payments.project"),
      cell: (project) => (
        <span>
          <span className="block font-medium">{project.title}</span>
          <span className="block text-xs text-muted">{project.reference}</span>
        </span>
      ),
      sortValue: (project) => project.title,
      mobile: "title",
    },
    {
      id: "status",
      header: t("client.payments.status"),
      cell: (project) => (
        <span className="inline-flex flex-wrap gap-1">
          <StatusBadge kind="project" status={project.status} />
          {project.openChange && (
            <span className="inline-flex h-6 items-center rounded-md bg-warning-bg px-2 text-xs font-medium text-warning-fg">
              {t("operator.projects.changeOpen")}
            </span>
          )}
        </span>
      ),
      sortValue: (project) => project.status,
    },
    {
      id: "client",
      header: t("operator.payments.client"),
      cell: (project) => project.clientName,
      sortValue: (project) => project.clientName,
    },
    {
      id: "operator",
      header: t("roles.OPERATOR"),
      cell: (project) => project.operatorName ?? t("admin.clients.unassigned"),
      sortValue: (project) => project.operatorName ?? "",
    },
    {
      id: "deadline",
      header: t("client.project.deadline"),
      cell: (project) => (
        <span className="whitespace-nowrap">{formatDate(project.deadline, language)}</span>
      ),
      sortValue: (project) => project.deadline,
    },
    {
      id: "outstanding",
      header: t("client.money.outstanding"),
      cell: (project) => <MoneyCell amount={project.balance} />,
      sortValue: (project) => project.balance,
      numeric: true,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title={t("nav.admin.projects")} description={t("admin.projects.subtitle")} />
      <Link
        to="/admin/projects/changes"
        className="flex items-center gap-4 rounded-lg border border-border bg-surface p-4 hover:bg-surface-muted"
      >
        <div className="min-w-0 flex-1">
          <p className="font-medium">{t("changes.admin.title")}</p>
          <p className="text-sm text-muted">
            {queue.isSuccess
              ? t("changes.admin.waitingCount", { count: queue.data.length })
              : t("changes.admin.subtitle")}
          </p>
        </div>
        <ChevronRight className="size-5 shrink-0 text-muted" aria-hidden="true" />
      </Link>
      <DataTable
        caption={t("nav.admin.projects")}
        columns={columns}
        rows={projects.data ?? []}
        rowKey={(project) => project.id}
        loading={projects.isPending}
        error={projects.isError ? apiError(projects.error) : undefined}
        onRetry={() => void projects.refetch()}
        defaultSort={{ columnId: "deadline", direction: "asc" }}
        empty={{ title: t("admin.projects.empty") }}
      />
    </div>
  );
}
