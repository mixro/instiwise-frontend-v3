import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { changesApi } from "@/features/changes/api";
import { adminApi } from "@/features/admin/api";
import {
  expensesApi,
  type AdminExpenseFilters,
  type ExpensePage,
  type OperatorExpenseFilters,
} from "./api";

export type ExpenseRole = "OPERATOR" | "ADMIN";

/** Where each role's expense list lives. */
export const EXPENSES_HOME: Record<ExpenseRole, string> = {
  OPERATOR: "/operator/finance",
  ADMIN: "/admin/finance?tab=expenses",
};

/** How often the admin's pending count (nav badge, overview) asks again. */
export const PENDING_POLL_MS = 30_000;

export const expenseKeys = {
  all: ["expenses"] as const,
  list: (role: ExpenseRole, filters: OperatorExpenseFilters | AdminExpenseFilters) =>
    [...expenseKeys.all, role, "list", filters] as const,
  pending: () => [...expenseKeys.all, "pending"] as const,
  categories: (role: ExpenseRole) => [...expenseKeys.all, role, "categories"] as const,
  projects: (role: ExpenseRole) => [...expenseKeys.all, role, "projects"] as const,
};

/** One list, paged with the server's cursor ("Show more"). */
export function useExpenses(role: ExpenseRole, filters: AdminExpenseFilters) {
  return useInfiniteQuery({
    queryKey: expenseKeys.list(role, filters),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }): Promise<ExpensePage> => {
      const query = { ...filters, cursor: pageParam };
      return role === "ADMIN"
        ? expensesApi.admin.list(query)
        : expensesApi.operator.list({
            status: query.status,
            projectId: query.projectId,
            cursor: query.cursor,
          });
    },
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
}

/** PENDING expenses waiting for an admin: the Finance badge and the overview. */
export const usePendingExpenses = (enabled = true) =>
  useQuery({
    queryKey: expenseKeys.pending(),
    queryFn: () => expensesApi.admin.pending(),
    enabled,
    refetchInterval: PENDING_POLL_MS,
  });

/** Active categories for the form (admins also see inactive ones in Settings). */
export const useExpenseCategories = (role: ExpenseRole) =>
  useQuery({
    queryKey: expenseKeys.categories(role),
    queryFn: () =>
      role === "ADMIN" ? expensesApi.admin.categories() : expensesApi.operator.categories(),
  });

/** Projects a variable cost may belong to: operators only get assigned clients' projects. */
export const useExpenseProjects = (role: ExpenseRole) =>
  useQuery({
    queryKey: expenseKeys.projects(role),
    queryFn: async () => {
      const projects =
        role === "ADMIN" ? await adminApi.projects() : await changesApi.operator.projects();
      return projects
        .filter((project) => project.status !== "DRAFT")
        .map(({ id, title, reference, clientName }) => ({ id, title, reference, clientName }));
    },
  });

/** After any expense change: lists, the pending count, the overview and the audit log. */
export function useRefreshExpenses() {
  const queryClient = useQueryClient();
  return useCallback(
    () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: expenseKeys.all }),
        queryClient.invalidateQueries({ queryKey: ["admin"] }),
      ]),
    [queryClient],
  );
}
