import { Navigate } from "react-router-dom";
import { useSession } from "@/hooks/useSession";
import { ROLE_HOME } from "./navigation";

/** "/" sends people to their own home. */
export function RoleHomeRedirect() {
  const { user } = useSession();
  return <Navigate to={user ? ROLE_HOME[user.role] : "/login"} replace />;
}
