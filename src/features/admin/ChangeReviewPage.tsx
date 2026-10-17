import { ArrowLeft, CircleCheck } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { changesApi, type ChangeRequest } from "@/features/changes/api";
import { ChangePreview } from "@/features/changes/ChangePreview";
import { useAdminQueue, useRefreshAfterDecision } from "@/features/changes/queries";
import { useErrorText } from "@/hooks/useErrorText";
import { useLanguage } from "@/hooks/useLanguage";
import { useToast } from "@/hooks/useToast";
import { ApiError } from "@/lib/api";
import { formatDate } from "@/lib/format";

function ReviewCard({ change }: { change: ChangeRequest }) {
  const { t } = useTranslation();
  const language = useLanguage();
  const { apiError } = useErrorText();
  const { toast } = useToast();
  const refresh = useRefreshAfterDecision();
  const [dialog, setDialog] = useState<"approve" | "reject" | null>(null);
  const [error, setError] = useState<string>();

  async function review(outcome: "APPROVE" | "REJECT", reason?: string) {
    setError(undefined);
    try {
      await changesApi.admin.review(change.id, { outcome, reason });
    } catch (failure) {
      setError(apiError(failure));
      if (failure instanceof ApiError && failure.code === "CHANGE_REQUEST_ALREADY_DECIDED") {
        void refresh();
      }
      throw failure;
    }
    toast({
      variant: "success",
      title:
        outcome === "APPROVE"
          ? t("changes.admin.approvedToast", { number: change.number })
          : t("changes.admin.rejectedToast", { number: change.number }),
    });
    void refresh();
  }

  const close = (open: boolean) => {
    if (!open) {
      setDialog(null);
      setError(undefined);
    }
  };

  return (
    <li className="space-y-4 rounded-lg border border-border bg-surface p-4">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">{change.title}</h2>
        <p className="text-sm text-muted">
          {change.projectTitle} ({change.projectReference}) · {change.clientName}
        </p>
        <p className="text-xs text-muted">
          {t("changes.proposedBy", {
            number: change.number,
            name: change.createdBy,
            date: formatDate(change.createdAt, language),
          })}
        </p>
      </div>
      <ChangePreview change={change} />
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button variant="primary" onClick={() => setDialog("approve")}>
          {t("changes.admin.approve")}
        </Button>
        <Button onClick={() => setDialog("reject")}>{t("changes.admin.reject")}</Button>
      </div>
      <ConfirmDialog
        open={dialog === "approve"}
        onOpenChange={close}
        title={t("changes.admin.approveTitle", { number: change.number })}
        description={t("changes.admin.approveBody", { client: change.clientName })}
        confirmLabel={t("changes.admin.approve")}
        error={error}
        onConfirm={() => review("APPROVE")}
      />
      <ConfirmDialog
        open={dialog === "reject"}
        onOpenChange={close}
        tone="danger"
        title={t("changes.admin.rejectTitle", { number: change.number })}
        description={t("changes.admin.rejectBody")}
        confirmLabel={t("changes.admin.reject")}
        reason={{ label: t("changes.admin.reasonLabel"), hint: t("changes.admin.reasonHint") }}
        error={error}
        onConfirm={(reason) => review("REJECT", reason)}
      />
    </li>
  );
}

/** Price or deadline changes waiting for an admin before the client sees them. */
export function ChangeReviewPage() {
  const { t } = useTranslation();
  const queue = useAdminQueue();

  return (
    <div className="space-y-6">
      <Link
        to="/admin/projects"
        className="-ml-1 inline-flex min-h-11 items-center gap-1 rounded-md px-1 text-sm text-muted hover:text-foreground sm:min-h-0"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        {t("nav.admin.projects")}
      </Link>
      <PageHeader title={t("changes.admin.title")} description={t("changes.admin.subtitle")} />

      {queue.isPending && (
        <div aria-busy="true">
          <Skeleton className="h-64 w-full rounded-lg" />
        </div>
      )}
      {queue.isError && <ErrorState error={queue.error} onRetry={() => void queue.refetch()} />}
      {queue.data?.length === 0 && (
        <EmptyState icon={CircleCheck} title={t("changes.admin.empty")} />
      )}
      {queue.data && queue.data.length > 0 && (
        <ul className="space-y-4">
          {queue.data.map((change) => (
            <ReviewCard key={change.id} change={change} />
          ))}
        </ul>
      )}
    </div>
  );
}
