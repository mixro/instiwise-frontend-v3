import { useTranslation } from "react-i18next";

export const MAIN_CONTENT_ID = "main-content";

/** First focusable element: lets keyboard users jump past the navigation. */
export function SkipLink() {
  const { t } = useTranslation();
  return (
    <a
      href={`#${MAIN_CONTENT_ID}`}
      className="sr-only rounded-md bg-brand px-4 py-2 text-sm font-medium text-brand-fg focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[200]"
    >
      {t("shell.skipToContent")}
    </a>
  );
}
