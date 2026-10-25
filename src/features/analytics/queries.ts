import { useQuery } from "@tanstack/react-query";
import { expensesApi } from "@/features/expenses/api";
import { expenseKeys, type ExpenseRole } from "@/features/expenses/queries";
import type { Period } from "./period";

/**
 * Analytics for a period, admin (whole company) or operator (assigned clients,
 * variable costs only). Under the expenses key, so any expense change refreshes it.
 */
export function useFinanceAnalytics<Role extends ExpenseRole>(role: Role, period: Period | null) {
  return useQuery({
    queryKey: [...expenseKeys.all, role, "analytics", period] as const,
    queryFn: () =>
      role === "ADMIN"
        ? expensesApi.admin.analytics(period as Period)
        : expensesApi.operator.analytics(period as Period),
    enabled: period !== null,
  });
}
