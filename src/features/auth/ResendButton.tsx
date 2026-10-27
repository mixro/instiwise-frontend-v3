import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
import { useCountdown } from "@/hooks/useCountdown";
import { useErrorText } from "@/hooks/useErrorText";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";
import { formatWait } from "./wait";

/**
 * What a send answers: the signed-in resend says when the next one is allowed;
 * null means nothing was sent (the form's own check failed).
 */
type SendResult = { resendAvailableAt: string; sentTo?: string } | null | undefined | void;

const COOLDOWN_SECONDS = 60;

interface ResendButtonProps {
  send: () => Promise<SendResult>;
  size?: "sm" | "md";
  className?: string;
}

/**
 * "Resend email" with the server's limits shown (ADR 0006): one email per 60
 * seconds, then a countdown; RATE_LIMITED shows how long to wait. The result is
 * announced in a polite live region.
 */
export function ResendButton({ send, size = "md", className }: ResendButtonProps) {
  const { t } = useTranslation();
  const { apiError } = useErrorText();
  const [seconds, startCountdown] = useCountdown();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ text: string; tone: "ok" | "error" }>();

  async function resend() {
    setPending(true);
    setMessage(undefined);
    try {
      const result = await send();
      if (result === null) return;
      const nextAt = result ? Date.parse(result.resendAvailableAt) : NaN;
      startCountdown(Number.isNaN(nextAt) ? COOLDOWN_SECONDS : (nextAt - Date.now()) / 1000);
      setMessage({
        tone: "ok",
        text: result?.sentTo
          ? t("auth.resend.sentTo", { email: result.sentTo })
          : t("auth.resend.sent"),
      });
    } catch (error) {
      if (error instanceof ApiError && error.code === "RATE_LIMITED") {
        const wait = error.retryAfterSeconds ?? COOLDOWN_SECONDS;
        startCountdown(wait);
        setMessage({
          tone: "error",
          text: t("auth.resend.limited", { time: formatWait(wait, t) }),
        });
      } else {
        setMessage({ tone: "error", text: apiError(error) });
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <Button
        size={size}
        loading={pending}
        disabled={seconds > 0}
        onClick={() => void resend()}
        className="w-full sm:w-auto"
      >
        {seconds > 0
          ? t("auth.resend.wait", { time: formatWait(seconds, t) })
          : pending
            ? t("auth.resend.sending")
            : t("auth.resend.button")}
      </Button>
      <p
        role="status"
        aria-live="polite"
        className={cn("text-xs", message?.tone === "error" ? "text-danger-fg" : "text-muted")}
      >
        {message?.text}
      </p>
    </div>
  );
}
