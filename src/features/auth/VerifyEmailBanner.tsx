import { MailWarning } from "lucide-react";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useSession } from "@/hooks/useSession";
import { ApiError } from "@/lib/api";
import { resendVerification } from "./api";
import { useMe } from "./queries";
import { ResendButton } from "./ResendButton";

/**
 * In every signed-in layout: until the sign-in email is confirmed, a reminder
 * with "Resend email" (ADR 0006). Unverified users can still use everything.
 * When the server no longer knows the session (a password reset ended it), sign out.
 */
export function VerifyEmailBanner() {
  const { t } = useTranslation();
  const { signOut } = useSession();
  const me = useMe();

  const ended = me.error instanceof ApiError && me.error.code === "UNAUTHENTICATED";
  useEffect(() => {
    if (ended) signOut();
  }, [ended, signOut]);

  if (!me.data || me.data.emailVerified) return null;

  return (
    <section
      aria-label={t("auth.banner.label")}
      className="border-b border-border bg-warning-bg text-sm text-warning-fg"
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-start gap-2">
          <MailWarning className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>{t("auth.banner.text", { email: me.data.email })}</span>
        </p>
        <ResendButton size="sm" send={resendVerification} className="shrink-0 sm:items-end" />
      </div>
    </section>
  );
}
