import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { useSession } from "@/hooks/useSession";
import { getMe } from "./api";

export const meKey = ["auth", "me"] as const;

/** The signed-in user as the server knows them: email, emailVerified, pendingEmail. */
export function useMe() {
  const { user } = useSession();
  return useQuery({ queryKey: meKey, queryFn: getMe, enabled: user !== null, retry: false });
}

/** After a verification, an email change or a cancellation. */
export function useRefreshMe() {
  const queryClient = useQueryClient();
  return useCallback(() => queryClient.invalidateQueries({ queryKey: meKey }), [queryClient]);
}
