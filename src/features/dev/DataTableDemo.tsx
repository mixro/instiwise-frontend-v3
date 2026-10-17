import { useState } from "react";
import { useTranslation } from "react-i18next";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { MoneyCell } from "@/components/MoneyCell";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/Button";
import { useLanguage } from "@/hooks/useLanguage";
import { formatDate } from "@/lib/format";
import { DemoSection } from "./DemoSection";
import { StateCell } from "./StateCell";
import { SAMPLE_PAYMENTS, type SamplePayment } from "./sample-data";

const STATES = ["default", "loading", "empty", "error"] as const;
type TableState = (typeof STATES)[number];

export function DataTableDemo() {
  const { t } = useTranslation();
  const language = useLanguage();
  const [state, setState] = useState<TableState>("default");

  const columns: DataTableColumn<SamplePayment>[] = [
    {
      id: "receipt",
      header: t("dev.table.receipt"),
      cell: (row) => <span className="font-medium whitespace-nowrap">{row.receipt}</span>,
      sortValue: (row) => row.receipt,
      mobile: "title",
    },
    {
      id: "status",
      header: t("dev.dataTable.status"),
      cell: (row) => <StatusBadge kind="payment" status={row.status} />,
      mobile: "title",
    },
    {
      id: "date",
      header: t("dev.table.date"),
      cell: (row) => <span className="whitespace-nowrap">{formatDate(row.date, language)}</span>,
      sortValue: (row) => row.date,
    },
    {
      id: "client",
      header: t("dev.table.client"),
      cell: (row) => row.client,
      sortValue: (row) => row.client,
    },
    {
      id: "method",
      header: t("dev.table.method"),
      cell: (row) => t(`dev.methods.${row.method}`),
    },
    {
      id: "amount",
      header: t("dev.table.amount"),
      cell: (row) => <MoneyCell amount={row.amount} />,
      sortValue: (row) => row.amount,
      numeric: true,
    },
  ];

  return (
    <DemoSection id="dataTable" title={t("dev.sections.dataTable")}>
      <StateCell label={t("dev.states.tryIt")} wide>
        <div
          role="group"
          aria-label={t("dev.dataTable.stateLabel")}
          className="flex flex-wrap gap-2"
        >
          {STATES.map((option) => (
            <Button
              key={option}
              size="sm"
              variant={state === option ? "primary" : "secondary"}
              aria-pressed={state === option}
              onClick={() => setState(option)}
            >
              {t(`dev.states.${option}`)}
            </Button>
          ))}
        </div>
        <DataTable
          caption={t("dev.dataTable.caption")}
          columns={columns}
          rows={state === "empty" ? [] : SAMPLE_PAYMENTS}
          rowKey={(row) => row.receipt}
          loading={state === "loading"}
          error={state === "error" ? t("dev.table.error") : undefined}
          onRetry={() => setState("default")}
          empty={{ title: t("dev.empty.title"), description: t("dev.empty.description") }}
          defaultSort={{ columnId: "date", direction: "desc" }}
        />
        <p className="text-sm text-muted">{t("dev.dataTable.mobileHint")}</p>
      </StateCell>
    </DemoSection>
  );
}
