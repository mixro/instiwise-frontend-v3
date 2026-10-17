import { GitCompareArrows } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { changesApi, type ChangeRequest } from "@/features/changes/api";
import { ChangeHistory } from "@/features/changes/ChangeHistory";
import { ChangePreview } from "@/features/changes/ChangePreview";
import { useClientChanges, useRefreshAfterDecision } from "@/features/changes/queries";
import { useErrorText } from "@/hooks/useErrorText";
import { useLanguage } from "@/hooks/useLanguage";
import { useToast } from "@/hooks/useToast";
import { ApiError } from "@/lib/api";
import { formatDate, formatTzs } from "@/lib/format";
import { useProjectId } from "./project-tabs";

type Pending = "accept" | "reject" | null;

/** The change waiting for the client's decision, then every earlier one. */
export function ChangesTab() {
  const { t } = useTranslation();
  const language = useLanguage();
  const { apiError } = useErrorText();
  const { toast } = useToast();
  const changes = useClientChanges(useProjectId());
  const refresh = useRefreshAfterDecision();
  const [dialog, setDialog] = useState<Pending>(null);
  const [error, setError] = useState<string>();

  if (changes.isPending) {
    return (
      <div aria-busy="true" className="space-y-3">
        <Skeleton className="h-6 w-1/2" />
        <Skeleton className="h-48 w-full rounded-lg" />
      </div>
    );
  }
  if (changes.isError) {
    return <ErrorState error={changes.error} onRetry={() => void changes.refetch()} />;
  }

  const waiting = changes.data.find((change) => change.status === "AWAITING_CLIENT_ACCEPTANCE");
  const history = changes.data.filter((change) => change !== waiting);

  async function decide(change: ChangeRequest, outcome: "ACCEPT" | "REJECT", reason?: string) {
    setError(undefined);
    try {
      await changesApi.client.decide(change.id, { outcome, reason });
    } catch (failure) {
      setError(apiError(failure));
      // Decided elsewhere in the meantime: show the outcome behind the dialog.
      if (failure instanceof ApiError && failure.code === "CHANGE_REQUEST_ALREADY_DECIDED") {
        void refresh();
      }
      throw failure;
    }
    toast({
      variant: "success",
      title:
        outcome === "ACCEPT"
          ? t("changes.client.acceptedToast", { number: change.number })
          : t("changes.client.rejectedToast", { number: change.number }),
    });
    void refresh();
  }

  if (!waiting && history.length === 0) {
    return (
      <EmptyState
        icon={GitCompareArrows}
        title={t("changes.client.empty")}
        description={t("changes.client.emptyBody")}
      />
    );
  }

  return (
    <div className="space-y-8">
      {waiting && (
        <section
          aria-labelledby="change-waiting"
          className="space-y-4 rounded-lg border border-border bg-surface-muted p-4"
        >
          <div className="space-y-1">
            <p className="text-xs font-medium tracking-wide text-muted uppercase">
              {t("changes.client.waiting")}
            </p>
            <h2 id="change-waiting" className="text-lg font-semibold">
              {waiting.title}
            </h2>
            <p className="text-xs text-muted">
              {t("changes.proposedBy", {
                number: waiting.number,
                name: waiting.createdBy,
                date: formatDate(waiting.createdAt, language),
              })}
            </p>
          </div>
          <ChangePreview change={waiting} />
          <p className="text-sm text-muted">{t("changes.client.whatAcceptMeans")}</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button variant="primary" onClick={() => setDialog("accept")}>
              {t("changes.client.accept")}
            </Button>
            <Button onClick={() => setDialog("reject")}>{t("changes.client.reject")}</Button>
          </div>

          <ConfirmDialog
            open={dialog === "accept"}
            onOpenChange={(open) => {
              setDialog(open ? "accept" : null);
              if (!open) setError(undefined);
            }}
            title={t("changes.client.acceptTitle", { number: waiting.number })}
            description={t("changes.client.acceptBody", {
              price: formatTzs(waiting.after.price, language),
              date: formatDate(waiting.after.deadline, language),
            })}
            confirmLabel={t("changes.client.accept")}
            error={error}
            onConfirm={() => decide(waiting, "ACCEPT")}
          />
          <ConfirmDialog
            open={dialog === "reject"}
            onOpenChange={(open) => {
              setDialog(open ? "reject" : null);
              if (!open) setError(undefined);
            }}
            tone="danger"
            title={t("changes.client.rejectTitle", { number: waiting.number })}
            description={t("changes.client.rejectBody")}
            confirmLabel={t("changes.client.reject")}
            reason={{
              label: t("changes.client.reasonLabel"),
              hint: t("changes.client.reasonHint"),
            }}
            error={error}
            onConfirm={(reason) => decide(waiting, "REJECT", reason)}
          />
        </section>
      )}

      {history.length > 0 && (
        <section aria-labelledby="change-history" className="space-y-3">
          <h2 id="change-history" className="text-base font-semibold">
            {t("changes.history.title")}
          </h2>
          <ChangeHistory changes={history} />
        </section>
      )}
    </div>
  );
}
