import { useTranslation } from "react-i18next";
import { SUPPORTED_LANGUAGES } from "@/i18n/languages";
import { cn } from "@/lib/cn";

export function LanguageToggle() {
  const { t, i18n } = useTranslation();
  const active = i18n.resolvedLanguage;

  return (
    <div
      role="group"
      aria-label={t("language.label")}
      className="inline-flex rounded-lg border border-border-strong bg-surface p-0.5"
    >
      {SUPPORTED_LANGUAGES.map((language) => (
        <button
          key={language}
          type="button"
          lang={language}
          aria-pressed={active === language}
          // The name contains the visible code ("sw"), as WCAG 2.5.3 requires.
          aria-label={`${t(`language.${language}`)}, ${language}`}
          title={t(`language.${language}`)}
          onClick={() => void i18n.changeLanguage(language)}
          className={cn(
            "h-8 min-w-10 rounded-md px-2 text-xs font-medium uppercase transition-colors",
            active === language
              ? "bg-brand text-brand-fg"
              : "text-muted hover:bg-surface-muted hover:text-foreground",
          )}
        >
          {language}
        </button>
      ))}
    </div>
  );
}
