import {
  Ban,
  CalendarX,
  CheckCheck,
  Hourglass,
  Lock,
  SearchX,
  type LucideIcon,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/Button";
import { StandalonePage } from "@/features/shell/StandalonePage";
import type { ResetCodeErrorCode } from "./api";

export type ResetProblem = ResetCodeErrorCode | "RATE_LIMITED";

type Key = "invalid" | "expired" | "cancelled" | "used" | "locked" | "limited";

const STATES: Record<ResetProblem, { key: Key; icon: LucideIcon }> = {
  RESET_CODE_NOT_FOUND: { key: "invalid", icon: SearchX },
  RESET_CODE_EXPIRED: { key: "expired", icon: CalendarX },
  RESET_CODE_CANCELLED: { key: "cancelled", icon: Ban },
  RESET_CODE_ALREADY_USED: { key: "used", icon: CheckCheck },
  RESET_CODE_LOCKED: { key: "locked", icon: Lock },
  RATE_LIMITED: { key: "limited", icon: Hourglass },
};

/**
 * Why a reset code cannot be used, and what to do. Never says whose code it
 * was or whether an account exists (ADR 0005).
 */
export function ResetCodeProblem({
  problem,
  onRetry,
}: {
  problem: ResetProblem;
  /** Rate limited: check the same code again later. */
  onRetry?: () => void;
}) {
  const { t } = useTranslation();
  const { key, icon } = STATES[problem];

  return (
    <StandalonePage>
      <EmptyState
        titleAs="h1"
        icon={icon}
        tone={key === "used" || key === "limited" ? "neutral" : "danger"}
        title={t(`auth.reset.states.${key}.title`)}
        description={t(`auth.reset.states.${key}.body`)}
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
              <Link to="/reset">{t("auth.reset.states.tryAnother")}</Link>
            </Button>
          </div>
        }
      />
    </StandalonePage>
  );
}
