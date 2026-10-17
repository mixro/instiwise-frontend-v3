import { ChevronDown, LogOut, UserRound } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/DropdownMenu";
import { useSession } from "@/hooks/useSession";
import { USER_MENU_LINK } from "./navigation";

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function UserMenu() {
  const { t } = useTranslation();
  const { user, signOut } = useSession();
  if (!user) return null;

  const link = USER_MENU_LINK[user.role];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {/* Named by the person's name (Radix adds "menu button"). The initials are CSS
            content, so the accessible name and the visible text always agree. */}
        <Button variant="ghost" className="gap-2 px-2">
          <span
            aria-hidden="true"
            data-initials={initials(user.name)}
            className="inline-flex size-8 items-center justify-center rounded-full bg-brand-soft text-xs font-semibold text-brand-text before:content-[attr(data-initials)]"
          />
          <span className="sr-only text-sm md:not-sr-only">{user.name}</span>
          <ChevronDown className="hidden size-4 text-muted md:block" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>
          <span className="block text-sm font-medium">{user.name}</span>
          <span className="block text-xs text-muted">{t(`roles.${user.role}`)}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {link && (
          <DropdownMenuItem asChild>
            <Link to={link.to}>
              <UserRound aria-hidden="true" />
              {t(link.label)}
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onSelect={signOut}>
          <LogOut aria-hidden="true" />
          {t("shell.signOut")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
