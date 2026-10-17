import { Monitor, Moon, Sun, type LucideIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/hooks/useTheme";
import { cn } from "@/lib/cn";
import type { Theme } from "@/lib/theme-context";

const OPTIONS: { value: Theme; icon: LucideIcon }[] = [
  { value: "light", icon: Sun },
  { value: "dark", icon: Moon },
  { value: "system", icon: Monitor },
];

export function ThemeToggle() {
  const { t } = useTranslation();
  const { theme, setTheme } = useTheme();

  return (
    <div
      role="group"
      aria-label={t("theme.label")}
      className="inline-flex rounded-lg border border-border-strong bg-surface p-0.5"
    >
      {OPTIONS.map(({ value, icon: Icon }) => (
        <button
          key={value}
          type="button"
          aria-pressed={theme === value}
          aria-label={t(`theme.${value}`)}
          title={t(`theme.${value}`)}
          onClick={() => setTheme(value)}
          className={cn(
            "inline-flex size-8 items-center justify-center rounded-md transition-colors",
            theme === value
              ? "bg-brand text-brand-fg"
              : "text-muted hover:bg-surface-muted hover:text-foreground",
          )}
        >
          <Icon className="size-4" aria-hidden="true" />
        </button>
      ))}
    </div>
  );
}
