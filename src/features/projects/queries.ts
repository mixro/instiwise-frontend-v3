import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { useSession } from "@/hooks/useSession";
import { projectsApi, type StaffRole } from "./api";

export const projectKeys = {
  all: ["projects"] as const,
  detail: (role: StaffRole, projectId: string) =>
    [...projectKeys.all, role, projectId, "detail"] as const,
  agreement: (role: StaffRole, projectId: string) =>
    [...projectKeys.all, role, projectId, "agreement"] as const,
};

export const useStaffProject = (role: StaffRole, projectId: string) =>
  useQuery({
    queryKey: projectKeys.detail(role, projectId),
    queryFn: () => projectsApi[role].get(projectId),
  });

export const useStaffAgreement = (role: StaffRole, projectId: string) =>
  useQuery({
    queryKey: projectKeys.agreement(role, projectId),
    queryFn: () => projectsApi[role].agreement(projectId),
  });

/** After creating, saving or sending: every list and count that shows projects. */
export function useRefreshProjects() {
  const queryClient = useQueryClient();
  return useCallback(() => queryClient.invalidateQueries(), [queryClient]);
}

/**
 * Whether to offer creating projects: admins always, operators only with the
 * admin-granted canCreateProjects permission. The server refuses (403) otherwise.
 */
export function useMayCreateProjects(role: StaffRole): boolean {
  const { user } = useSession();
  if (role === "ADMIN") return user?.role === "ADMIN";
  return user?.role === "OPERATOR" && user.permissions?.canCreateProjects === true;
}
