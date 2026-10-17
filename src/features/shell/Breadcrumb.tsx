import { ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router-dom";
import type { Role } from "@/lib/roles";
import { ROLE_HOME, findNavItem } from "./navigation";

/** Workspace › current page. On phones only the current page shows. */
export function Breadcrumb({ role }: { role: Role }) {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const current = findNavItem(role, pathname);

  return (
    <nav aria-label={t("shell.breadcrumb")} className="min-w-0">
      <ol className="flex min-w-0 items-center gap-1 text-sm">
        <li className="hidden items-center gap-1 sm:flex">
          <Link to={ROLE_HOME[role]} className="rounded-md text-muted hover:text-foreground">
            {t(`roles.${role}`)}
          </Link>
          <ChevronRight className="size-4 text-muted" aria-hidden="true" />
        </li>
        <li aria-current="page" className="truncate font-medium">
          {current ? t(current.label) : t("errors.notFound.title")}
        </li>
      </ol>
    </nav>
  );
}
