import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { operatorApi } from "./api";

export const operatorKeys = {
  all: ["operator"] as const,
  dashboard: () => [...operatorKeys.all, "dashboard"] as const,
  clients: () => [...operatorKeys.all, "clients"] as const,
  client: (id: string) => [...operatorKeys.all, "client", id] as const,
  payments: () => [...operatorKeys.all, "payments"] as const,
  receipt: (number: string) => [...operatorKeys.all, "receipt", number] as const,
  profile: () => [...operatorKeys.all, "profile"] as const,
};

export const useOperatorProfile = () =>
  useQuery({ queryKey: operatorKeys.profile(), queryFn: () => operatorApi.profile() });

export const useOperatorDashboard = () =>
  useQuery({ queryKey: operatorKeys.dashboard(), queryFn: operatorApi.dashboard });

export const useOperatorClients = (enabled = true) =>
  useQuery({ queryKey: operatorKeys.clients(), queryFn: () => operatorApi.clients(), enabled });

export const useOperatorClient = (id: string, enabled = true) =>
  useQuery({
    queryKey: operatorKeys.client(id),
    queryFn: () => operatorApi.client(id),
    enabled,
  });

export const useOperatorPayments = () =>
  useQuery({
    queryKey: operatorKeys.payments(),
    queryFn: () => operatorApi.payments(),
    // The newest page of rows; older pages are not loaded yet.
    select: (page) => page.items,
  });

export const useOperatorReceipt = (number: string) =>
  useQuery({ queryKey: operatorKeys.receipt(number), queryFn: () => operatorApi.receipt(number) });

/** After recording a payment every total changes; ask the server again for all of them. */
export function useRefreshOperator() {
  const queryClient = useQueryClient();
  return useCallback(
    () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: operatorKeys.all }),
        queryClient.invalidateQueries({ queryKey: ["changes"] }),
      ]),
    [queryClient],
  );
}
