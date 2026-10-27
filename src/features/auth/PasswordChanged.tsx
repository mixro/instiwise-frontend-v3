import { KeyRound } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/Button";
import { StandalonePage } from "@/features/shell/StandalonePage";

/** After any password reset: never signed in automatically, so on to sign in. */
export function PasswordChanged() {
  const { t } = useTranslation();
  return (
    <StandalonePage>
      <EmptyState
        titleAs="h1"
        icon={KeyRound}
        title={t("auth.reset.done.title")}
        description={t("auth.reset.done.body")}
        action={
          <Button asChild variant="primary">
            <Link to="/login">{t("auth.reset.signIn")}</Link>
          </Button>
        }
      />
    </StandalonePage>
  );
}
