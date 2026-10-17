import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useSession } from "@/hooks/useSession";
import type { Role } from "@/lib/roles";
import { ROLE_HOME } from "./navigation";

/**
 * Shows a role's area only to that role. Signed out: sign-in, then back here.
 * Another role: that role's home. This only picks screens; the backend
 * still authorizes every request.
 */
export function RequireRole({ role, children }: { role: Role; children: ReactNode }) {
  const { user } = useSession();
  const location = useLocation();

  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (user.role !== role) return <Navigate to={ROLE_HOME[user.role]} replace />;
  return <>{children}</>;
}
