import { CircleAlert } from "lucide-react";
import { useTranslation } from "react-i18next";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/Button";
import { useErrorText } from "@/hooks/useErrorText";

/** A failed load: what went wrong (by error code) and a way to try again. */
export function ErrorState({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const { t } = useTranslation();
  const { apiError } = useErrorText();

  return (
    <EmptyState
      tone="danger"
      icon={CircleAlert}
      title={apiError(error)}
      action={
        <Button size="sm" onClick={onRetry}>
          {t("ui.retry")}
        </Button>
      }
    />
  );
}
