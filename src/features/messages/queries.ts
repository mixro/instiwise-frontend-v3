import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { MESSAGE_POLL_MS } from "@/features/client/queries";
import { messagesApi, type OperatorConversationFilters } from "./api";

export type StaffRole = "OPERATOR" | "ADMIN";

/** How often an operator's inbox list (and nav badge) asks for news. */
export const INBOX_POLL_MS = 30_000;

export const messageKeys = {
  all: ["messages"] as const,
  conversations: (role: StaffRole, filters: OperatorConversationFilters) =>
    [...messageKeys.all, role, "conversations", filters] as const,
  thread: (role: StaffRole, projectId: string) =>
    [...messageKeys.all, role, "thread", projectId] as const,
};

/**
 * Admin reads are audited on the server, so admin queries never refresh by
 * themselves (no polling, no refetch on focus). They load each time a screen
 * opens them (so every view is recorded) and on Refresh.
 */
const adminOnce = {
  staleTime: 0,
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
} as const;

export function useConversations(
  role: StaffRole,
  filters: OperatorConversationFilters,
  enabled = true,
) {
  return useQuery({
    queryKey: messageKeys.conversations(role, filters),
    queryFn: () =>
      role === "OPERATOR"
        ? messagesApi.operator.conversations(filters)
        : messagesApi.admin.conversations(filters),
    enabled,
    ...(role === "OPERATOR" ? { refetchInterval: INBOX_POLL_MS } : adminOnce),
  });
}

export function useThread(role: StaffRole, projectId: string) {
  return useQuery({
    queryKey: messageKeys.thread(role, projectId),
    queryFn: () =>
      role === "OPERATOR"
        ? messagesApi.operator.messages(projectId)
        : messagesApi.admin.messages(projectId),
    // The newest page of the conversation; older pages are not loaded yet.
    select: (page) => page.items,
    ...(role === "OPERATOR" ? { refetchInterval: MESSAGE_POLL_MS } : adminOnce),
  });
}

/** The operator's conversations with unread client messages, for the nav badge. */
export function useOperatorUnread(enabled: boolean): number | undefined {
  const { data } = useConversations("OPERATOR", {}, enabled);
  return enabled ? data?.unreadTotal : undefined;
}

/** After reading or sending: the inbox and the badge change. */
export function useRefreshInbox() {
  const queryClient = useQueryClient();
  return useCallback(
    (role: StaffRole) =>
      queryClient.invalidateQueries({ queryKey: [...messageKeys.all, role, "conversations"] }),
    [queryClient],
  );
}
