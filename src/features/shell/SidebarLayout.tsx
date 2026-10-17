import { Menu, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, Outlet } from "react-router-dom";
import { LanguageToggle } from "@/components/LanguageToggle";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Logo, Mark } from "@/components/brand/Logo";
import { Button } from "@/components/ui/Button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/Sheet";
import { cn } from "@/lib/cn";
import type { Role } from "@/lib/roles";
import { Breadcrumb } from "./Breadcrumb";
import { DevToolbar } from "./DevToolbar";
import { SidebarNav } from "./SidebarNav";
import { MAIN_CONTENT_ID, SkipLink } from "./SkipLink";
import { UserMenu } from "./UserMenu";
import { ROLE_HOME } from "./navigation";

export const SIDEBAR_STORAGE_KEY = "instiwise.sidebar";

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(SIDEBAR_STORAGE_KEY) === "collapsed";
  } catch {
    return false;
  }
}

/**
 * Operators and admins: a sidebar from the lg breakpoint (collapsible to icons,
 * remembered), a drawer below it, and a top bar with breadcrumb, language,
 * theme and the user menu.
 */
export function SidebarLayout({ role }: { role: Exclude<Role, "CLIENT"> }) {
  const { t } = useTranslation();
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const [drawerOpen, setDrawerOpen] = useState(false);

  function toggleCollapsed() {
    const next = !collapsed;
    setCollapsed(next);
    try {
      localStorage.setItem(SIDEBAR_STORAGE_KEY, next ? "collapsed" : "expanded");
    } catch {
      // Storage unavailable: the choice lasts for this visit only.
    }
  }

  const CollapseIcon = collapsed ? PanelLeftOpen : PanelLeftClose;
  const collapseLabel = collapsed ? t("shell.expandSidebar") : t("shell.collapseSidebar");

  return (
    <div className="min-h-dvh lg:flex">
      <SkipLink />

      <aside
        className={cn(
          "sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-border bg-surface lg:flex",
          collapsed ? "w-16" : "w-64",
        )}
      >
        <div
          className={cn(
            "flex h-14 shrink-0 items-center border-b border-border",
            collapsed ? "justify-center" : "px-4",
          )}
        >
          <Link
            to={ROLE_HOME[role]}
            className="rounded-md"
            aria-label={collapsed ? t("app.name") : undefined}
          >
            {collapsed ? <Mark size={32} /> : <Logo height={32} />}
          </Link>
        </div>
        <SidebarNav role={role} collapsed={collapsed} />
        <div className="border-t border-border p-2">
          <Button
            variant="ghost"
            onClick={toggleCollapsed}
            aria-expanded={!collapsed}
            aria-label={collapsed ? collapseLabel : undefined}
            className={cn("h-10 w-full sm:h-10", collapsed ? "px-0" : "justify-start px-3")}
          >
            <CollapseIcon className="size-4 text-muted" aria-hidden="true" />
            {!collapsed && <span className="text-muted">{collapseLabel}</span>}
          </Button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <DevToolbar />
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border bg-surface px-4">
          <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="-ml-2 lg:hidden"
                aria-label={t("shell.openMenu")}
              >
                <Menu className="size-5" aria-hidden="true" />
              </Button>
            </SheetTrigger>
            <SheetContent
              side="left"
              aria-describedby={undefined}
              className="w-72 max-w-[85vw] gap-0 p-0 sm:max-w-[85vw]"
            >
              <SheetTitle className="sr-only">{t("shell.mainNav")}</SheetTitle>
              <div className="flex h-14 shrink-0 items-center border-b border-border px-4">
                <Logo height={28} />
              </div>
              <SidebarNav role={role} touch onNavigate={() => setDrawerOpen(false)} />
              <div className="flex flex-wrap gap-2 border-t border-border p-4">
                <LanguageToggle />
                <ThemeToggle />
              </div>
            </SheetContent>
          </Sheet>

          <Breadcrumb role={role} />

          <div className="ml-auto flex items-center gap-2">
            <div className="hidden items-center gap-2 sm:flex">
              <LanguageToggle />
              <ThemeToggle />
            </div>
            <UserMenu />
          </div>
        </header>

        <main id={MAIN_CONTENT_ID} className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
