import { useTranslation } from "react-i18next";
import { Link, NavLink, Outlet } from "react-router-dom";
import { LanguageToggle } from "@/components/LanguageToggle";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Logo } from "@/components/brand/Logo";
import { cn } from "@/lib/cn";
import { DevToolbar } from "./DevToolbar";
import { MAIN_CONTENT_ID, SkipLink } from "./SkipLink";
import { NAVIGATION, ROLE_HOME } from "./navigation";

/**
 * Clients mostly use phones: one column and a bottom tab bar with 56 px targets.
 * From the md breakpoint the same links move into the header.
 */
export function ClientLayout() {
  const { t } = useTranslation();
  const items = NAVIGATION.CLIENT;

  return (
    <div className="min-h-dvh">
      <SkipLink />
      <DevToolbar />
      <header className="sticky top-0 z-30 border-b border-border bg-surface">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-4 px-4">
          <Link to={ROLE_HOME.CLIENT} className="shrink-0 rounded-md">
            <Logo height={28} />
          </Link>
          <nav aria-label={t("shell.mainNav")} className="hidden md:block">
            <ul className="flex items-center gap-1">
              {items.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={"end" in item}
                    className={({ isActive }) =>
                      cn(
                        "inline-flex h-10 items-center rounded-md px-3 text-sm font-medium transition-colors",
                        isActive
                          ? "bg-brand-soft text-brand-text"
                          : "text-muted hover:bg-surface-muted hover:text-foreground",
                      )
                    }
                  >
                    {t(item.label)}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <LanguageToggle />
            {/* On phones the theme switch lives on the Account page. */}
            <div className="hidden sm:block">
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      <main id={MAIN_CONTENT_ID} className="mx-auto max-w-5xl px-4 pt-6 pb-28 md:pb-12">
        <Outlet />
      </main>

      <nav
        aria-label={t("shell.mainNav")}
        className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        <ul className="mx-auto grid max-w-md grid-cols-4">
          {items.map(({ to, label, icon: Icon, ...item }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={"end" in item}
                className={({ isActive }) =>
                  cn(
                    "relative flex min-h-14 flex-col items-center justify-center gap-1 px-1 text-xs font-medium transition-colors",
                    // A bar over the active tab, so the state is shown by shape as well as colour.
                    "before:absolute before:inset-x-4 before:top-0 before:h-0.5 before:rounded-full",
                    isActive
                      ? "text-brand-text before:bg-brand-text"
                      : "text-muted hover:text-foreground",
                  )
                }
              >
                <Icon className="size-5" aria-hidden="true" />
                <span className="max-w-full truncate">{t(label)}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
