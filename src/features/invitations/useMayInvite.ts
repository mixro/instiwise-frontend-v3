import { useSession } from "@/hooks/useSession";

/**
 * Whether to offer inviting clients: admins always, operators only with the
 * admin-granted canInviteClients permission. Hiding the action is not the
 * protection; the server refuses with 403 PERMISSION_REQUIRED.
 */
export function useMayInviteClients(): boolean {
  const { user } = useSession();
  if (user?.role === "ADMIN") return true;
  return user?.role === "OPERATOR" && user.permissions?.canInviteClients === true;
}
