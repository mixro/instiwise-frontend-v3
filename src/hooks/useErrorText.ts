import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { ApiError } from "@/lib/api";

// Translation keys built at runtime are checked with i18n.exists() first, so the
// cast below never reaches t() with a key that is missing from the locale files.
type AnyKey = "apiErrors.UNKNOWN_ERROR";

/** Turns validation keys and API error codes into translated text. Never shows a server message. */
export function useErrorText() {
  const { t, i18n } = useTranslation();

  /** A schema message such as "validation.emailInvalid". */
  const fieldError = useCallback(
    (message: string | undefined): string | undefined => {
      if (!message) return undefined;
      return i18n.exists(message) ? t(message as AnyKey) : t("apiErrors.UNKNOWN_ERROR");
    },
    [t, i18n],
  );

  /** Any thrown value from an API call, by its stable error code. */
  const apiError = useCallback(
    (error: unknown): string => {
      const code = error instanceof ApiError ? error.code : "UNKNOWN_ERROR";
      const key = `apiErrors.${code}`;
      return i18n.exists(key) ? t(key as AnyKey) : t("apiErrors.UNKNOWN_ERROR");
    },
    [t, i18n],
  );

  return { fieldError, apiError };
}
