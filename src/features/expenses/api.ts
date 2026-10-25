import { apiClient } from "@/lib/api";
import type { Operation, QueryOf, Schema } from "@/lib/contract/types";

/*
 * Expenses and finance analytics for staff (contracts/openapi.yaml, tag Expenses;
 * decided 2026-10-25). No screens yet.
 * - Operators submit expenses (PENDING), see only their own entries, may withdraw
 *   their own PENDING ones, and get analytics for their assigned clients'
 *   projects only: variable expenses, no fixed costs, no company totals.
 * - Admins enter expenses (approved at once), approve or reject PENDING ones,
 *   correct approved ones with reversal or adjustment rows (never edits), manage
 *   the categories and see company analytics.
 * - Money is whole TZS; totals and margins are computed by the server; margins
 *   are basis points. Clients never see any of this.
 * Served by src/mocks/expenses.ts until the backend exists.
 */

export type Expense = Schema<"Expense">;
export type ExpenseDraft = Schema<"ExpenseDraft">;
export type ExpensePage = Schema<"ExpensePage">;
export type ExpenseStatus = Schema<"ExpenseStatus">;
export type ExpenseKind = Schema<"ExpenseKind">;
export type ExpenseCategory = Schema<"ExpenseCategory">;
export type ExpenseCategoryOption = Schema<"ExpenseCategoryOption">;
export type OperatorFinanceAnalytics = Schema<"OperatorFinanceAnalytics">;
export type AdminFinanceAnalytics = Schema<"AdminFinanceAnalytics">;
export type OperatorExpenseFilters = QueryOf<Operation<"/operator/expenses", "get">>;
export type AdminExpenseFilters = QueryOf<Operation<"/admin/expenses", "get">>;
export type Period = Schema<"Period">;
export type FinanceMonth = Schema<"FinanceMonth">;
export type CategoryTotal = Schema<"CategoryTotal">;
export type ProjectFinance = Schema<"ProjectFinance">;

const expense = (expenseId: string) => ({ path: { expenseId } });
const category = (categoryId: string) => ({ path: { categoryId } });

export const expensesApi = {
  operator: {
    list: (filters: OperatorExpenseFilters = {}) =>
      apiClient.GET("/operator/expenses", { query: filters }),
    submit: (body: ExpenseDraft) => apiClient.POST("/operator/expenses", { body }),
    withdraw: (expenseId: string) =>
      apiClient.POST("/operator/expenses/{expenseId}/withdrawal", expense(expenseId)),
    categories: () => apiClient.GET("/operator/expense-categories"),
    analytics: (period: Period) => apiClient.GET("/operator/finance", { query: period }),
  },
  admin: {
    list: (filters: AdminExpenseFilters = {}) =>
      apiClient.GET("/admin/expenses", { query: filters }),
    create: (body: ExpenseDraft) => apiClient.POST("/admin/expenses", { body }),
    pending: () => apiClient.GET("/admin/expenses/pending"),
    approve: (expenseId: string) =>
      apiClient.POST("/admin/expenses/{expenseId}/approval", expense(expenseId)),
    reject: (expenseId: string, reason: string) =>
      apiClient.POST("/admin/expenses/{expenseId}/rejection", {
        ...expense(expenseId),
        body: { reason },
      }),
    reverse: (expenseId: string, reason: string) =>
      apiClient.POST("/admin/expenses/{expenseId}/reversal", {
        ...expense(expenseId),
        body: { reason },
      }),
    adjust: (expenseId: string, amount: number, reason: string) =>
      apiClient.POST("/admin/expenses/{expenseId}/adjustment", {
        ...expense(expenseId),
        body: { amount, reason },
      }),
    categories: () => apiClient.GET("/admin/expense-categories"),
    createCategory: (name: string) =>
      apiClient.POST("/admin/expense-categories", { body: { name } }),
    updateCategory: (categoryId: string, body: Schema<"ExpenseCategoryUpdate">) =>
      apiClient.PATCH("/admin/expense-categories/{categoryId}", { ...category(categoryId), body }),
    deleteCategory: (categoryId: string) =>
      apiClient.DELETE("/admin/expense-categories/{categoryId}", category(categoryId)),
    analytics: (period: Period) => apiClient.GET("/admin/finance/analytics", { query: period }),
  },
};
