import { ShieldX } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/Button";
import { useSession } from "@/hooks/useSession";
import { StandalonePage } from "./StandalonePage";

/**
 * Where people land in another role's area, or when the server answers 403 (an
 * operator opening an unassigned client). Signed-out visitors are offered sign-in.
 */
export function NoAccessPage() {
  const { t } = useTranslation();
  const { user } = useSession();

  return (
    <StandalonePage>
      <EmptyState
        titleAs="h1"
        icon={ShieldX}
        title={t("errors.noAccess.title")}
        description={t("errors.noAccess.body")}
        action={
          <Button asChild variant="primary">
            {user ? (
              <Link to="/">{t("errors.goHome")}</Link>
            ) : (
              <Link to="/login">{t("auth.login.submit")}</Link>
            )}
          </Button>
        }
      />
    </StandalonePage>
  );
}
