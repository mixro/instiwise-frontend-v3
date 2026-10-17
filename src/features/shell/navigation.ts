import {
  ChartColumn,
  FolderKanban,
  House,
  LayoutDashboard,
  MessageSquare,
  Receipt,
  ScrollText,
  Settings,
  UserCog,
  UserRound,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type { Role } from "@/lib/roles";

/** Each role works under its own URL prefix, so a wrong-role link is easy to catch. */
export const ROLE_HOME: Record<Role, string> = {
  CLIENT: "/client",
  OPERATOR: "/operator",
  ADMIN: "/admin",
};

interface NavItemShape {
  to: string;
  label: string;
  icon: LucideIcon;
  /** The role's home: active only on the exact path. */
  end?: true;
}

/**
 * Main navigation per role. Client: as asked for phase 1.3 (Home, Projects,
 * Payments, Account). Operator and admin: product brief sections 15.3 and 15.4.
 */
export const NAVIGATION = {
  CLIENT: [
    { to: "/client", label: "nav.client.home", icon: House, end: true },
    { to: "/client/projects", label: "nav.client.projects", icon: FolderKanban },
    { to: "/client/payments", label: "nav.client.payments", icon: Receipt },
    { to: "/client/account", label: "nav.client.account", icon: UserRound },
  ],
  OPERATOR: [
    { to: "/operator", label: "nav.operator.dashboard", icon: LayoutDashboard, end: true },
    { to: "/operator/clients", label: "nav.operator.clients", icon: Users },
    { to: "/operator/projects", label: "nav.operator.projects", icon: FolderKanban },
    { to: "/operator/messages", label: "nav.operator.messages", icon: MessageSquare },
    { to: "/operator/payments", label: "nav.operator.payments", icon: Receipt },
    { to: "/operator/profile", label: "nav.operator.profile", icon: UserRound },
  ],
  ADMIN: [
    { to: "/admin", label: "nav.admin.overview", icon: ChartColumn, end: true },
    { to: "/admin/clients", label: "nav.admin.clients", icon: Users },
    { to: "/admin/projects", label: "nav.admin.projects", icon: FolderKanban },
    { to: "/admin/operators", label: "nav.admin.operators", icon: UserCog },
    { to: "/admin/finance", label: "nav.admin.finance", icon: Wallet },
    { to: "/admin/messages", label: "nav.admin.messages", icon: MessageSquare },
    { to: "/admin/audit-logs", label: "nav.admin.auditLogs", icon: ScrollText },
    { to: "/admin/settings", label: "nav.admin.settings", icon: Settings },
  ],
} as const satisfies Record<Role, readonly NavItemShape[]>;

export type NavItem = (typeof NAVIGATION)[Role][number];
export type NavLabelKey = NavItem["label"];

/** The user-menu shortcut for staff roles (their own profile or settings page). */
export const USER_MENU_LINK: Partial<Record<Role, NavItem>> = {
  OPERATOR: NAVIGATION.OPERATOR[5],
  ADMIN: NAVIGATION.ADMIN[7],
};

/** The nav item a path belongs to (the most specific match), if any. */
export function findNavItem(role: Role, pathname: string): NavItem | undefined {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  const items: readonly NavItem[] = NAVIGATION[role];
  return items
    .filter((item) =>
      "end" in item ? path === item.to : path === item.to || path.startsWith(`${item.to}/`),
    )
    .sort((a, b) => b.to.length - a.to.length)[0];
}
