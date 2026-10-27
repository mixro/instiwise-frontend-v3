import { useCallback, useMemo, useState, type ReactNode } from "react";
import { DEMO_TOOLS } from "@/lib/demo-mode";
import { isRole, type Role } from "@/lib/roles";
import {
  MOCK_ROLE_STORAGE_KEY,
  MOCK_SIGNED_OUT,
  SessionContext,
  type OperatorPermissions,
  type SessionContextValue,
  type SessionUser,
} from "@/lib/session-context";

// Demo people for the mock role switcher. Real production builds leave them out:
// DEMO_TOOLS is a build-time false there, so nothing reads them.
const DEMO_PEOPLE: Record<Role, string> = {
  CLIENT: "Neema Mwakyusa",
  OPERATOR: "Baraka Mushi",
  ADMIN: "Rehema Said",
};

// What the demo operator (Baraka Mushi) is allowed, as seeded in mocks/staff-seed.ts.
const DEMO_OPERATOR_PERMISSIONS: OperatorPermissions = {
  canInviteClients: true,
  canCreateProjects: true,
};

function mockNames(): Record<Role, string> | null {
  return DEMO_TOOLS ? DEMO_PEOPLE : null;
}

/** The demo person for a bare role (role switcher, e2e and unit tests). */
function mockUser(role: Role, names: Record<Role, string>): SessionUser {
  return role === "OPERATOR"
    ? { role, name: names[role], permissions: DEMO_OPERATOR_PERMISSIONS }
    : { role, name: names[role] };
}

function readPermissions(value: unknown): OperatorPermissions | undefined {
  if (typeof value !== "object" || value === null) return undefined;
  const { canInviteClients, canCreateProjects } = value as Partial<OperatorPermissions>;
  return typeof canInviteClients === "boolean" && typeof canCreateProjects === "boolean"
    ? { canInviteClients, canCreateProjects }
    : undefined;
}

/**
 * Demo and development only: the session survives reloads in localStorage, either as a
 * bare role (set by the role switcher or the e2e suite) or as the JSON user
 * returned by the sign-in form. Nothing stored means signed out.
 */
function readStoredSession(): SessionUser | null {
  const names = mockNames();
  if (!names) return null;
  try {
    const stored = localStorage.getItem(MOCK_ROLE_STORAGE_KEY);
    if (stored === MOCK_SIGNED_OUT) return null;
    if (isRole(stored)) return mockUser(stored, names);
    if (stored) {
      const parsed = JSON.parse(stored) as Partial<SessionUser>;
      if (isRole(parsed.role) && typeof parsed.name === "string") {
        const permissions = readPermissions(parsed.permissions);
        const email = typeof parsed.email === "string" ? { email: parsed.email } : {};
        return permissions
          ? { role: parsed.role, name: parsed.name, permissions, ...email }
          : { role: parsed.role, name: parsed.name, ...email };
      }
    }
  } catch {
    // Unreadable storage: start signed out.
  }
  return null;
}

function storeSession(value: string): void {
  if (!DEMO_TOOLS) return;
  try {
    localStorage.setItem(MOCK_ROLE_STORAGE_KEY, value);
  } catch {
    // Storage unavailable: the session lasts for this visit only.
  }
}

/**
 * Who is signed in. Set by the sign-in and registration screens. In a real
 * production build it lasts for the visit only until tokens arrive (phase 4.3);
 * in the demo and in development it is remembered and the toolbar can switch to
 * a mock role.
 *
 * The role here only chooses which screens to show. The backend decides what
 * data anyone may see.
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(readStoredSession);

  const signIn = useCallback((next: SessionUser) => {
    setUser(next);
    storeSession(JSON.stringify(next));
  }, []);

  const signOut = useCallback(() => {
    setUser(null);
    storeSession(MOCK_SIGNED_OUT);
  }, []);

  const setMockRole = useCallback(
    (role: Role | null) => {
      const names = mockNames();
      if (!role || !names) {
        signOut();
        return;
      }
      setUser(mockUser(role, names));
      storeSession(role);
    },
    [signOut],
  );

  const value = useMemo<SessionContextValue>(
    () => ({
      user,
      signIn,
      signOut,
      setMockRole: DEMO_TOOLS ? setMockRole : null,
    }),
    [user, signIn, signOut, setMockRole],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
