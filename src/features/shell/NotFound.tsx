import { SearchX } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/Button";
import { useSession } from "@/hooks/useSession";

/** 404 content. Used alone and inside the role layouts (unknown path under /operator, …). */
export function NotFound() {
  const { t } = useTranslation();
  const { user } = useSession();

  return (
    <EmptyState
      titleAs="h1"
      icon={SearchX}
      title={t("errors.notFound.title")}
      description={t("errors.notFound.body")}
      action={
        user && (
          <Button asChild variant="primary">
            <Link to="/">{t("errors.goHome")}</Link>
          </Button>
        )
      }
    />
  );
}
