import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { changesApi } from "./api";

export const changeKeys = {
  all: ["changes"] as const,
  client: (projectId: string) => [...changeKeys.all, "client", projectId] as const,
  operatorProjects: () => [...changeKeys.all, "operator", "projects"] as const,
  operatorProject: (projectId: string) =>
    [...changeKeys.all, "operator", "project", projectId] as const,
  operatorList: (projectId: string) => [...changeKeys.all, "operator", "list", projectId] as const,
  adminQueue: () => [...changeKeys.all, "admin", "queue"] as const,
};

export const useClientChanges = (projectId: string) =>
  useQuery({
    queryKey: changeKeys.client(projectId),
    queryFn: () => changesApi.client.list(projectId),
  });

export const useOperatorProjects = () =>
  useQuery({ queryKey: changeKeys.operatorProjects(), queryFn: changesApi.operator.projects });

export const useOperatorProject = (projectId: string) =>
  useQuery({
    queryKey: changeKeys.operatorProject(projectId),
    queryFn: () => changesApi.operator.project(projectId),
  });

export const useOperatorChanges = (projectId: string) =>
  useQuery({
    queryKey: changeKeys.operatorList(projectId),
    queryFn: () => changesApi.operator.list(projectId),
  });

export const useAdminQueue = () =>
  useQuery({ queryKey: changeKeys.adminQueue(), queryFn: changesApi.admin.queue });

/**
 * After any decision: change lists, and the client area (a new agreement version
 * changes the price, deadline and balances, which the server recomputes).
 */
export function useRefreshAfterDecision() {
  const queryClient = useQueryClient();
  return useCallback(
    () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: changeKeys.all }),
        queryClient.invalidateQueries({ queryKey: ["client"] }),
      ]),
    [queryClient],
  );
}
