import { lazy } from "react";
import { useTranslation } from "react-i18next";
import { DataTable } from "@/components/DataTable";
import { MoneyCell } from "@/components/MoneyCell";
import type { CategoryTotal } from "@/features/expenses/api";
import type { ExpenseRole } from "@/features/expenses/queries";
import { ChartPanel } from "./ChartPanel";

// The chart library loads only when a chart is first shown.
const CategoryChart = lazy(() =>
  import("./CategoryChart").then((m) => ({ default: m.CategoryChart })),
);

interface CategoryPanelProps {
  role: ExpenseRole;
  categories: CategoryTotal[];
  /** The series name: expenses for admins, variable expenses for operators. */
  label: string;
}

/** Approved expenses per category, as a chart or a table. */
export function CategoryPanel({ role, categories, label }: CategoryPanelProps) {
  const { t } = useTranslation();
  const title =
    role === "ADMIN" ? t("analytics.category.title") : t("analytics.category.titleOperator");

  return (
    <ChartPanel
      title={title}
      description={t("analytics.category.description")}
      chart={
        categories.length === 0 ? (
          <p className="text-sm text-muted">{t("analytics.category.empty")}</p>
        ) : (
          <CategoryChart categories={categories} label={label} title={title} />
        )
      }
      table={
        <DataTable
          caption={title}
          rows={categories}
          rowKey={(row) => row.categoryId}
          empty={{ title: t("analytics.category.empty") }}
          columns={[
            {
              id: "name",
              header: t("analytics.category.name"),
              mobile: "title",
              cell: (row) => row.name,
            },
            {
              id: "amount",
              header: t("analytics.category.amount"),
              numeric: true,
              cell: (row) => <MoneyCell amount={row.amount} />,
            },
          ]}
        />
      }
    />
  );
}
