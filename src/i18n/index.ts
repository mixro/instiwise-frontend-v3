import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";
import enCommon from "./locales/en/common.json";
import swCommon from "./locales/sw/common.json";
import {
  DEFAULT_LANGUAGE,
  isLanguage,
  LANGUAGE_STORAGE_KEY,
  SUPPORTED_LANGUAGES,
  type Language,
} from "./languages";

/**
 * English and Swahili from day one (docs/decisions/0004-languages.md).
 * Add a namespace per feature as screens arrive; keep the key sets of both
 * languages identical (a test enforces this).
 */
void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { common: enCommon },
      sw: { common: swCommon },
    },
    supportedLngs: [...SUPPORTED_LANGUAGES],
    nonExplicitSupportedLngs: true,
    fallbackLng: DEFAULT_LANGUAGE,
    defaultNS: "common",
    ns: ["common"],
    initAsync: false,
    interpolation: { escapeValue: false },
    detection: {
      order: ["localStorage", "navigator"],
      lookupLocalStorage: LANGUAGE_STORAGE_KEY,
      caches: ["localStorage"],
    },
  });

function syncDocumentLanguage(language: string | undefined): void {
  document.documentElement.lang = isLanguage(language) ? language : DEFAULT_LANGUAGE;
}

syncDocumentLanguage(i18n.resolvedLanguage);
i18n.on("languageChanged", () => syncDocumentLanguage(i18n.resolvedLanguage));

/** The active language, narrowed to one we support. */
export function currentLanguage(): Language {
  const language = i18n.resolvedLanguage;
  return isLanguage(language) ? language : DEFAULT_LANGUAGE;
}

export default i18n;
