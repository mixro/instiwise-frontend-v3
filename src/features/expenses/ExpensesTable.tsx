import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { MoneyCell } from "@/components/MoneyCell";
import { Button } from "@/components/ui/Button";
import { useLanguage } from "@/hooks/useLanguage";
import { formatDate } from "@/lib/format";
import type { Expense } from "./api";
import { ExpenseStatusCell } from "./ExpenseStatusCell";

interface ExpensesTableProps {
  caption: string;
  rows: Expense[];
  loading?: boolean;
  error?: string;
  onRetry?: () => void;
  empty: { title: string; description?: string; action?: ReactNode };
  /** Admin list: who entered each row. */
  showEnteredBy?: boolean;
  /** Admin list: the reference opens the history (original and corrections). */
  onShowHistory?: (expense: Expense) => void;
  /** The buttons for a row, or null for none. */
  actions: (expense: Expense) => ReactNode;
  /** The server has more rows ("Show more" loads the next page). */
  hasMore?: boolean;
  loadingMore?: boolean;
  onShowMore?: () => void;
}

/** Expense rows in the server's order (newest first). Tables become cards on phones. */
export function ExpensesTable({
  caption,
  rows,
  loading,
  error,
  onRetry,
  empty,
  showEnteredBy = false,
  onShowHistory,
  actions,
  hasMore,
  loadingMore,
  onShowMore,
}: ExpensesTableProps) {
  const { t } = useTranslation();
  const language = useLanguage();

  const columns: DataTableColumn<Expense>[] = [
    {
      id: "reference",
      header: t("expenses.columns.reference"),
      cell: (expense) =>
        onShowHistory ? (
          <button
            type="button"
            onClick={() => onShowHistory(expense)}
            className="inline-flex min-h-11 items-center font-medium whitespace-nowrap text-brand-text underline underline-offset-4 hover:no-underline sm:min-h-0"
          >
            {expense.reference}
            <span className="sr-only"> {t("finance.showHistory")}</span>
          </button>
        ) : (
          <span className="font-medium whitespace-nowrap">{expense.reference}</span>
        ),
      mobile: "title",
    },
    {
      id: "date",
      header: t("expenses.columns.date"),
      cell: (expense) => (
        <span className="whitespace-nowrap">{formatDate(expense.paidOn, language)}</span>
      ),
    },
    {
      id: "description",
      header: t("expenses.form.description"),
      cell: (expense) => (
        <span>
          <span className="block">{expense.description}</span>
          {expense.vendor && <span className="block text-xs text-muted">{expense.vendor}</span>}
        </span>
      ),
    },
    {
      id: "kind",
      header: t("expenses.columns.kind"),
      cell: (expense) => t(`expenses.kind.${expense.kind}`),
    },
    {
      id: "category",
      header: t("expenses.columns.category"),
      cell: (expense) => expense.category.name,
    },
    {
      id: "project",
      header: t("expenses.columns.project"),
      cell: (expense) =>
        expense.projectTitle ?? <span className="text-muted">{t("expenses.companyCost")}</span>,
    },
    {
      id: "amount",
      header: t("expenses.columns.amount"),
      cell: (expense) => <MoneyCell amount={expense.amount} />,
      numeric: true,
    },
    {
      id: "status",
      header: t("expenses.columns.status"),
      cell: (expense) => <ExpenseStatusCell expense={expense} />,
    },
    ...(showEnteredBy
      ? [
          {
            id: "enteredBy",
            header: t("expenses.columns.enteredBy"),
            cell: (expense: Expense) => (
              <span>
                <span className="block">{expense.enteredBy.name}</span>
                <span className="block text-xs text-muted">
                  {t(`roles.${expense.enteredBy.role}`)}
                </span>
              </span>
            ),
          },
        ]
      : []),
    {
      id: "actions",
      header: t("expenses.columns.actions"),
      cell: (expense) => actions(expense) ?? <span className="text-muted">—</span>,
    },
  ];

  return (
    <div className="space-y-3">
      <DataTable
        caption={caption}
        columns={columns}
        rows={rows}
        rowKey={(expense) => expense.id}
        loading={loading}
        error={error}
        onRetry={onRetry}
        empty={empty}
      />
      {hasMore && (
        <Button loading={loadingMore} onClick={onShowMore} className="w-full sm:w-auto">
          {t("expenses.showMore")}
        </Button>
      )}
    </div>
  );
}
