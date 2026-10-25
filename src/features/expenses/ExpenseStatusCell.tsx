import { useTranslation } from "react-i18next";
import { StatusBadge } from "@/components/StatusBadge";
import type { Expense } from "./api";

/**
 * An expense's status (Awaiting approval, Approved, Rejected…) with the reason
 * when it was rejected, or a correction row's kind with the expense it corrects.
 */
export function ExpenseStatusCell({ expense }: { expense: Expense }) {
  const { t } = useTranslation();
  if (expense.rowType !== "EXPENSE") {
    return (
      <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
        <StatusBadge kind="correction" status={expense.rowType} />
        {expense.corrects && (
          <span className="text-xs text-muted">
            {t("expenses.corrects", { reference: expense.corrects })}
          </span>
        )}
      </span>
    );
  }
  return (
    <span className="flex flex-col items-start gap-1">
      <StatusBadge kind="expense" status={expense.status} />
      {expense.status === "REJECTED" && expense.decisionReason && (
        <span className="text-xs text-muted">
          {t("expenses.rejectedBecause", { reason: expense.decisionReason })}
        </span>
      )}
    </span>
  );
}
