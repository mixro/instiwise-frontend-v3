import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { adminApi, type AuditFilters } from "./api";

export const adminKeys = {
  all: ["admin"] as const,
  overview: () => [...adminKeys.all, "overview"] as const,
  clients: () => [...adminKeys.all, "clients"] as const,
  projects: () => [...adminKeys.all, "projects"] as const,
  operators: () => [...adminKeys.all, "operators"] as const,
  finance: () => [...adminKeys.all, "finance"] as const,
  audit: (filters: AuditFilters) => [...adminKeys.all, "audit", filters] as const,
  settings: () => [...adminKeys.all, "settings"] as const,
};

export const useAdminOverview = () =>
  useQuery({ queryKey: adminKeys.overview(), queryFn: adminApi.overview });
export const useAdminClients = () =>
  useQuery({ queryKey: adminKeys.clients(), queryFn: adminApi.clients });
export const useAdminProjects = () =>
  useQuery({ queryKey: adminKeys.projects(), queryFn: adminApi.projects });
export const useAdminOperators = () =>
  useQuery({ queryKey: adminKeys.operators(), queryFn: adminApi.operators });
export const useAdminFinance = () =>
  useQuery({ queryKey: adminKeys.finance(), queryFn: adminApi.finance });
export const useAuditLog = (filters: AuditFilters) =>
  useQuery({ queryKey: adminKeys.audit(filters), queryFn: () => adminApi.audit(filters) });
export const useAdminSettings = () =>
  useQuery({ queryKey: adminKeys.settings(), queryFn: adminApi.settings });

/**
 * After any admin action: everything the admin, operators and clients see may
 * have changed (assignments, balances, the audit log), so ask the server again.
 */
export function useRefreshAll() {
  const queryClient = useQueryClient();
  return useCallback(() => queryClient.invalidateQueries(), [queryClient]);
}
