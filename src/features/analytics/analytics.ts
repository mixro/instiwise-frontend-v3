import type { AdminFinanceAnalytics, OperatorFinanceAnalytics } from "@/features/expenses/api";

export type Analytics = AdminFinanceAnalytics | OperatorFinanceAnalytics;

/** Only the admin's analytics carry fixed costs and company totals. */
export const isAdminAnalytics = (data: Analytics): data is AdminFinanceAnalytics =>
  "fixedExpenses" in data;

/** Nothing came in, nothing approved went out and nothing is waiting: an empty period. */
export function isEmptyPeriod(data: Analytics): boolean {
  const spent = isAdminAnalytics(data) ? data.expenses : data.variableExpenses;
  return data.collected === 0 && spent === 0 && data.awaitingApproval.count === 0;
}
