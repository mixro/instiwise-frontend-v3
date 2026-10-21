import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { invitationsApi, type AdminInvitationFilters } from "./api";

export const invitationKeys = {
  all: ["invitations"] as const,
  operator: () => [...invitationKeys.all, "operator"] as const,
  admin: (filters: AdminInvitationFilters) => [...invitationKeys.all, "admin", filters] as const,
};

/** Only call for an operator who may invite (the server answers 403 otherwise). */
export const useOperatorInvitations = (enabled: boolean) =>
  useQuery({
    queryKey: invitationKeys.operator(),
    queryFn: () => invitationsApi.operator.list(),
    enabled,
  });

export const useAdminInvitations = (filters: AdminInvitationFilters) =>
  useQuery({
    queryKey: invitationKeys.admin(filters),
    queryFn: () => invitationsApi.admin.list(filters),
  });

/** After creating or revoking: lists, and the audit log the admin may be looking at. */
export function useRefreshInvitations() {
  const queryClient = useQueryClient();
  return useCallback(
    () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: invitationKeys.all }),
        queryClient.invalidateQueries({ queryKey: ["admin", "audit"] }),
      ]),
    [queryClient],
  );
}
