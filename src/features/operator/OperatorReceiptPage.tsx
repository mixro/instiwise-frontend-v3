import { ArrowLeft, CircleCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, useLocation, useParams } from "react-router-dom";
import { ErrorState } from "@/components/ErrorState";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { ReceiptDetails } from "@/features/receipts/ReceiptDetails";
import { NotFound } from "@/features/shell/NotFound";
import { ApiError } from "@/lib/api";
import { useOperatorReceipt } from "./queries";

/** The receipt for a payment of an assigned client; the end of the record-payment flow. */
export function OperatorReceiptPage() {
  const { t } = useTranslation();
  const number = useParams().receiptNumber ?? "";
  const justRecorded = (useLocation().state as { justRecorded?: boolean } | null)?.justRecorded;
  const receipt = useOperatorReceipt(number);

  if (receipt.error instanceof ApiError && receipt.error.status === 404) return <NotFound />;

  return (
    <div className="max-w-2xl space-y-6">
      <Link
        to="/operator/payments"
        className="-ml-1 inline-flex min-h-11 items-center gap-1 rounded-md px-1 text-sm text-muted hover:text-foreground sm:min-h-0"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        {t("nav.operator.payments")}
      </Link>
      <PageHeader title={t("client.receipt.title", { number })} />

      {justRecorded && (
        <p
          role="status"
          className="flex items-start gap-2 rounded-lg bg-brand-soft px-4 py-3 text-sm text-brand-text"
        >
          <CircleCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {t("operator.record.done", { number })}
        </p>
      )}

      {receipt.isPending && <Skeleton className="h-80 w-full rounded-lg" />}
      {receipt.isError && (
        <ErrorState error={receipt.error} onRetry={() => void receipt.refetch()} />
      )}
      {receipt.data && <ReceiptDetails receipt={receipt.data} />}

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button asChild variant="primary">
          <Link to="/operator/payments/new">{t("operator.record.another")}</Link>
        </Button>
        <Button asChild>
          <Link to="/operator/payments">{t("operator.record.backToRecords")}</Link>
        </Button>
      </div>
    </div>
  );
}
