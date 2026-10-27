import { KeyRound } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { ResetCodeStatus } from "@/features/auth/api";
import { useLanguage } from "@/hooks/useLanguage";
import { formatDateTime } from "@/lib/format";

/** "Reset code active until …" under an account that has one; nothing otherwise. Never the code. */
export function ResetCodeNote({ resetCode }: { resetCode: ResetCodeStatus }) {
  const { t } = useTranslation();
  const language = useLanguage();
  if (!resetCode) return null;
  return (
    <span className="mt-1 flex items-center gap-1 text-xs font-medium text-warning-fg">
      <KeyRound className="size-3.5 shrink-0" aria-hidden="true" />
      {t("admin.reset.active", { expires: formatDateTime(resetCode.expiresAt, language) })}
    </span>
  );
}
