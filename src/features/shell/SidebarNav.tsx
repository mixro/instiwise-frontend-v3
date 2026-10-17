import { useTranslation } from "react-i18next";
import { NavLink } from "react-router-dom";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/Tooltip";
import { cn } from "@/lib/cn";
import type { Role } from "@/lib/roles";
import { NAVIGATION } from "./navigation";

interface SidebarNavProps {
  role: Exclude<Role, "CLIENT">;
  /** Icons only; labels move to tooltips and aria-labels. */
  collapsed?: boolean;
  /** Called after a link is chosen (closes the phone drawer). */
  onNavigate?: () => void;
  /** Taller rows for the phone drawer. */
  touch?: boolean;
}

export function SidebarNav({ role, collapsed, onNavigate, touch }: SidebarNavProps) {
  const { t } = useTranslation();

  return (
    <nav aria-label={t("shell.mainNav")} className="flex-1 overflow-y-auto p-2">
      <ul className="flex flex-col gap-1">
        {NAVIGATION[role].map(({ to, label, icon: Icon, ...item }) => {
          const text = t(label);
          const link = (
            <NavLink
              to={to}
              end={"end" in item}
              onClick={onNavigate}
              aria-label={collapsed ? text : undefined}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors",
                  touch ? "h-12" : "h-10",
                  collapsed && "justify-center px-0",
                  isActive
                    ? "bg-brand-soft text-brand-text"
                    : "text-muted hover:bg-surface-muted hover:text-foreground",
                )
              }
            >
              <Icon className="size-4 shrink-0" aria-hidden="true" />
              {!collapsed && <span className="truncate">{text}</span>}
            </NavLink>
          );

          return (
            <li key={to}>
              {collapsed ? (
                <Tooltip>
                  <TooltipTrigger asChild>{link}</TooltipTrigger>
                  <TooltipContent side="right">{text}</TooltipContent>
                </Tooltip>
              ) : (
                link
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
