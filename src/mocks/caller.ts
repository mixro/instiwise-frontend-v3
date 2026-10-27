import { isRole, type Role } from "@/lib/roles";
import { MOCK_ROLE_STORAGE_KEY } from "@/lib/session-context";
import { fail } from "./contract";

/**
 * Who is calling, as far as the mock can tell: the demo session in local
 * storage (a bare role from the role switcher, or the signed-in user as JSON,
 * with the email when the sign-in form stored one). The real server reads the
 * access token instead. Null: signed out.
 */
export function callerSession(): { role: Role; email?: string } | null {
  try {
    const stored = localStorage.getItem(MOCK_ROLE_STORAGE_KEY);
    if (isRole(stored)) return { role: stored };
    const parsed = stored ? (JSON.parse(stored) as { role?: unknown; email?: unknown }) : null;
    if (!isRole(parsed?.role)) return null;
    return typeof parsed.email === "string"
      ? { role: parsed.role, email: parsed.email }
      : { role: parsed.role };
  } catch {
    return null;
  }
}

export const callerRole = (): Role | null => callerSession()?.role ?? null;

/** 401 when signed out, 403 for another role, as x-roles says; undefined when allowed. */
export function refuseUnless(...roles: Role[]) {
  const caller = callerRole();
  if (!caller) return fail(401, "UNAUTHENTICATED");
  if (!roles.includes(caller)) return fail(403, "FORBIDDEN");
  return undefined;
}
