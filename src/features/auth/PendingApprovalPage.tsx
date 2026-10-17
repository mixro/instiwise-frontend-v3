import { Hourglass } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/Button";
import { StandalonePage } from "@/features/shell/StandalonePage";

/** After operator registration, and when a not-yet-approved operator tries to sign in. */
export function PendingApprovalPage() {
  const { t } = useTranslation();

  return (
    <StandalonePage>
      <EmptyState
        titleAs="h1"
        icon={Hourglass}
        title={t("auth.pending.title")}
        description={t("auth.pending.body")}
        action={
          <Button asChild>
            <Link to="/login">{t("auth.pending.backToLogin")}</Link>
          </Button>
        }
      />
    </StandalonePage>
  );
}
