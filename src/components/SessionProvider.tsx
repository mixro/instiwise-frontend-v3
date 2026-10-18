import { useCallback, useMemo, useState, type ReactNode } from "react";
import { DEMO_TOOLS } from "@/lib/demo-mode";
import { isRole, type Role } from "@/lib/roles";
import {
  MOCK_ROLE_STORAGE_KEY,
  MOCK_SIGNED_OUT,
  SessionContext,
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

function mockNames(): Record<Role, string> | null {
  return DEMO_TOOLS ? DEMO_PEOPLE : null;
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
    if (isRole(stored)) return { role: stored, name: names[stored] };
    if (stored) {
      const parsed = JSON.parse(stored) as Partial<SessionUser>;
      if (isRole(parsed.role) && typeof parsed.name === "string") {
        return { role: parsed.role, name: parsed.name };
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
      setUser({ role, name: names[role] });
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
