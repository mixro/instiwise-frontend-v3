import { Ban, CalendarX, SearchX, UserCheck, type LucideIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/Button";
import { StandalonePage } from "@/features/shell/StandalonePage";
import type { InvitationErrorCode } from "./api";

const STATES: Record<
  InvitationErrorCode,
  { key: "invalid" | "expired" | "revoked" | "used"; icon: LucideIcon }
> = {
  INVITATION_NOT_FOUND: { key: "invalid", icon: SearchX },
  INVITATION_EXPIRED: { key: "expired", icon: CalendarX },
  INVITATION_REVOKED: { key: "revoked", icon: Ban },
  INVITATION_ALREADY_USED: { key: "used", icon: UserCheck },
};

/** Invalid, expired, revoked and already-used invitations: say what happened and what to do. */
export function InvitationProblem({ code }: { code: InvitationErrorCode }) {
  const { t } = useTranslation();
  const { key, icon } = STATES[code];

  return (
    <StandalonePage>
      <EmptyState
        titleAs="h1"
        icon={icon}
        tone={key === "used" ? "neutral" : "danger"}
        title={t(`auth.invite.states.${key}.title`)}
        description={t(`auth.invite.states.${key}.body`)}
        action={
          <div className="flex flex-col gap-2 sm:flex-row">
            {key === "used" && (
              <Button asChild variant="primary">
                <Link to="/login">{t("auth.invite.signIn")}</Link>
              </Button>
            )}
            <Button asChild variant={key === "used" ? "secondary" : "primary"}>
              <Link to="/invite">{t("auth.invite.states.tryAnother")}</Link>
            </Button>
          </div>
        }
      />
    </StandalonePage>
  );
}
