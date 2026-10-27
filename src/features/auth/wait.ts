import type { TFunction } from "i18next";

/** "45 seconds" or "12 minutes": how long to wait before trying again. */
export function formatWait(seconds: number, t: TFunction): string {
  return seconds < 90
    ? t("time.seconds", { count: Math.max(1, Math.ceil(seconds)) })
    : t("time.minutes", { count: Math.ceil(seconds / 60) });
}
