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
  /** Counts shown next to items, by path, with what they mean for screen readers. */
  badges?: Partial<Record<string, { count: number; label: string }>>;
}

export function SidebarNav({ role, collapsed, onNavigate, touch, badges }: SidebarNavProps) {
  const { t } = useTranslation();

  return (
    <nav aria-label={t("shell.mainNav")} className="flex-1 overflow-y-auto p-2">
      <ul className="flex flex-col gap-1">
        {NAVIGATION[role].map(({ to, label, icon: Icon, ...item }) => {
          const text = t(label);
          const count = badges?.[to]?.count ?? 0;
          const countText = count > 0 ? (badges?.[to]?.label ?? "") : "";
          const link = (
            <NavLink
              to={to}
              end={"end" in item}
              onClick={onNavigate}
              aria-label={collapsed ? [text, countText].filter(Boolean).join(", ") : undefined}
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
              <span className="relative shrink-0">
                <Icon className="size-4" aria-hidden="true" />
                {collapsed && count > 0 && (
                  <span
                    aria-hidden="true"
                    className="absolute -top-1 -right-1 size-2 rounded-full bg-brand-text"
                  />
                )}
              </span>
              {!collapsed && <span className="truncate">{text}</span>}
              {!collapsed && count > 0 && (
                <span className="ml-auto rounded-full bg-brand-text px-2 py-0.5 text-xs font-semibold text-surface">
                  <span aria-hidden="true">{count}</span>
                  <span className="sr-only">{countText}</span>
                </span>
              )}
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
