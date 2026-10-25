import { lazy } from "react";
import { useTranslation } from "react-i18next";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { MoneyCell } from "@/components/MoneyCell";
import type { FinanceMonth } from "@/features/expenses/api";
import type { ExpenseRole } from "@/features/expenses/queries";
import { useLanguage } from "@/hooks/useLanguage";
import { formatMonth } from "@/lib/format";
import { ChartLegend } from "./ChartLegend";
import { ChartPanel } from "./ChartPanel";
import type { SeriesKey } from "./series";

// The chart library loads only when a chart is first shown.
const TrendChart = lazy(() => import("./TrendChart").then((m) => ({ default: m.TrendChart })));

type AmountField = "collected" | "fixedExpenses" | "variableExpenses" | "expenses" | "profit";

interface TrendPanelProps {
  role: ExpenseRole;
  months: FinanceMonth[];
  labels: Record<SeriesKey, string>;
}

/** Month by month: a chart, or the same figures as a table (with the fixed/variable split for admins). */
export function TrendPanel({ role, months, labels }: TrendPanelProps) {
  const { t } = useTranslation();
  const language = useLanguage();
  const title = t("analytics.trend.title");

  const amount = (field: AmountField, header: string): DataTableColumn<FinanceMonth> => ({
    id: field,
    header,
    numeric: true,
    cell: (row) => <MoneyCell amount={row[field] ?? 0} />,
  });
  const columns: DataTableColumn<FinanceMonth>[] = [
    {
      id: "month",
      header: t("analytics.series.month"),
      mobile: "title",
      cell: (row) => formatMonth(row.month, language),
    },
    amount("collected", labels.collected),
    ...(role === "ADMIN"
      ? [
          amount("fixedExpenses", t("analytics.series.fixedExpenses")),
          amount("variableExpenses", t("analytics.series.variableExpenses")),
        ]
      : []),
    amount("expenses", labels.expenses),
    amount("profit", labels.profit),
  ];

  return (
    <ChartPanel
      title={title}
      description={t("analytics.trend.description")}
      legend={
        <ChartLegend
          items={(["collected", "expenses", "profit"] as const).map((key) => ({
            key,
            label: labels[key],
          }))}
        />
      }
      chart={<TrendChart months={months} labels={labels} title={title} />}
      table={
        <DataTable
          caption={title}
          columns={columns}
          rows={months}
          rowKey={(row) => row.month}
          empty={{ title: t("analytics.empty.title") }}
        />
      }
    />
  );
}
