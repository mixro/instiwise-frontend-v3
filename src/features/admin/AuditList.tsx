import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { useLanguage } from "@/hooks/useLanguage";
import { formatDateTime, formatTzs } from "@/lib/format";
import type { AuditEntry } from "./api";

interface AuditListProps {
  entries: AuditEntry[];
  loading?: boolean;
  error?: string;
  onRetry?: () => void;
  empty: { title: string; description?: string; action?: ReactNode };
}

/** Who did what, to what, when, and why. The values are data; the words are translated here. */
export function AuditList({ entries, loading, error, onRetry, empty }: AuditListProps) {
  const { t } = useTranslation();
  const language = useLanguage();

  function details(entry: AuditEntry): string {
    return [
      entry.amount !== undefined ? formatTzs(entry.amount, language) : null,
      entry.correction ? t("audit.details.correction", { number: entry.correction }) : null,
      entry.to
        ? entry.from
          ? t("audit.details.fromTo", { from: entry.from, to: entry.to })
          : t("audit.details.to", { to: entry.to })
        : null,
      entry.reason ? t("audit.details.reason", { reason: entry.reason }) : null,
    ]
      .filter(Boolean)
      .join(" · ");
  }

  const columns: DataTableColumn<AuditEntry>[] = [
    {
      id: "when",
      header: t("audit.when"),
      cell: (entry) => (
        <time dateTime={entry.at} className="whitespace-nowrap">
          {formatDateTime(entry.at, language)}
        </time>
      ),
      sortValue: (entry) => entry.at,
      mobile: "title",
    },
    {
      id: "user",
      header: t("audit.user"),
      cell: (entry) => (
        <span>
          <span className="block font-medium">{entry.actor}</span>
          <span className="block text-xs text-muted">{t(`roles.${entry.actorRole}`)}</span>
        </span>
      ),
      sortValue: (entry) => entry.actor,
    },
    {
      id: "action",
      header: t("audit.action"),
      cell: (entry) => t(`audit.actions.${entry.action}`),
      sortValue: (entry) => entry.action,
    },
    { id: "target", header: t("audit.target"), cell: (entry) => entry.target },
    { id: "details", header: t("audit.details.title"), cell: (entry) => details(entry) || "—" },
  ];

  return (
    <DataTable
      caption={t("nav.admin.auditLogs")}
      columns={columns}
      rows={entries}
      rowKey={(entry) => entry.id}
      loading={loading}
      error={error}
      onRetry={onRetry}
      defaultSort={{ columnId: "when", direction: "desc" }}
      empty={empty}
    />
  );
}
