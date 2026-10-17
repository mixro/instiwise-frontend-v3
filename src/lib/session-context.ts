import { createContext } from "react";
import type { Role } from "./roles";

export interface SessionUser {
  name: string;
  role: Role;
}

export interface SessionContextValue {
  /** null when nobody is signed in. */
  user: SessionUser | null;
  /** After a successful sign-in or client registration. */
  signIn: (user: SessionUser) => void;
  signOut: () => void;
  /** Development builds only (the mock role switcher); null in production. */
  setMockRole: ((role: Role | null) => void) | null;
}

export const MOCK_ROLE_STORAGE_KEY = "instiwise.mockRole";

/** Stored instead of a role when the mock user is signed out. */
export const MOCK_SIGNED_OUT = "SIGNED_OUT";

export const SessionContext = createContext<SessionContextValue | null>(null);
