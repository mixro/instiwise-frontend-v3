import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { ROLE_HOME } from "@/features/shell/navigation";
import { useSession } from "@/hooks/useSession";

/**
 * Sign-in and invitation pages are for signed-out visitors. Once someone is
 * signed in (including the moment the sign-in form succeeds) they go back to the
 * page that sent them to sign in, if it belongs to their role, or to their home.
 */
export function GuestOnly({ children }: { children: ReactNode }) {
  const { user } = useSession();
  const location = useLocation();

  if (user) {
    const home = ROLE_HOME[user.role];
    const from = (location.state as { from?: string } | null)?.from;
    return <Navigate to={from?.startsWith(home) ? from : home} replace />;
  }
  return <>{children}</>;
}
