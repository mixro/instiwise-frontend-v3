import { useTranslation } from "react-i18next";
import { DEFAULT_LANGUAGE, isLanguage, type Language } from "@/i18n/languages";

/** The active language; re-renders the caller when it changes (unlike currentLanguage()). */
export function useLanguage(): Language {
  const { i18n } = useTranslation();
  const language = i18n.resolvedLanguage;
  return isLanguage(language) ? language : DEFAULT_LANGUAGE;
}
