import {
  CalendarX,
  CheckCheck,
  Hourglass,
  RefreshCw,
  SearchX,
  type LucideIcon,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/Button";
import { StandalonePage } from "@/features/shell/StandalonePage";
import type { ResetTokenErrorCode } from "./api";

export type ResetLinkIssue = ResetTokenErrorCode | "RATE_LIMITED";

type Key = "invalid" | "expired" | "used" | "cancelled" | "limited";

const STATES: Record<ResetLinkIssue, { key: Key; icon: LucideIcon }> = {
  RESET_TOKEN_INVALID: { key: "invalid", icon: SearchX },
  RESET_TOKEN_EXPIRED: { key: "expired", icon: CalendarX },
  RESET_TOKEN_USED: { key: "used", icon: CheckCheck },
  RESET_TOKEN_CANCELLED: { key: "cancelled", icon: RefreshCw },
  RATE_LIMITED: { key: "limited", icon: Hourglass },
};

/** Why a reset link cannot be used, and the way on. Never says whose link it was (ADR 0006). */
export function ResetLinkProblem({
  issue,
  onRetry,
}: {
  issue: ResetLinkIssue;
  onRetry?: () => void;
}) {
  const { t } = useTranslation();
  const { key, icon } = STATES[issue];
  // Rate limiting has one wording for codes and links.
  const text = (part: "title" | "body") =>
    key === "limited"
      ? t(`auth.reset.states.limited.${part}`)
      : t(`auth.resetLink.states.${key}.${part}`);

  return (
    <StandalonePage>
      <EmptyState
        titleAs="h1"
        icon={icon}
        tone={key === "used" || key === "limited" ? "neutral" : "danger"}
        title={text("title")}
        description={text("body")}
        action={
          <div className="flex flex-col gap-2 sm:flex-row">
            {key === "used" && (
              <Button asChild variant="primary">
                <Link to="/login">{t("auth.reset.signIn")}</Link>
              </Button>
            )}
            {key === "limited" && onRetry && (
              <Button variant="primary" onClick={onRetry}>
                {t("auth.reset.states.retry")}
              </Button>
            )}
            <Button asChild variant={key === "used" || key === "limited" ? "secondary" : "primary"}>
              <Link to="/forgot-password">{t("auth.resetLink.requestNew")}</Link>
            </Button>
          </div>
        }
      />
    </StandalonePage>
  );
}
