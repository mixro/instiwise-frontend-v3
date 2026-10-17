import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ErrorState } from "@/components/ErrorState";
import { PageHeader } from "@/components/PageHeader";
import { Skeleton } from "@/components/ui/Skeleton";
import { BalanceSummary } from "./BalanceSummary";
import { PaymentsTable } from "./PaymentsTable";
import { ReceiptSheet } from "./ReceiptSheet";
import { usePayments } from "./queries";

/** Every recorded payment across the client's projects, with receipts. */
export function PaymentsPage() {
  const { t } = useTranslation();
  const payments = usePayments();
  const [receipt, setReceipt] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <PageHeader title={t("client.payments.title")} description={t("client.payments.external")} />

      {payments.isPending && (
        <div aria-busy="true" className="space-y-4">
          <Skeleton className="h-36 w-full rounded-lg" />
          <Skeleton className="h-40 w-full rounded-lg" />
        </div>
      )}

      {payments.isError && (
        <ErrorState error={payments.error} onRetry={() => void payments.refetch()} />
      )}

      {payments.data && (
        <>
          <BalanceSummary totals={payments.data.totals} />
          <section aria-labelledby="payments-list" className="space-y-3">
            <h2 id="payments-list" className="text-base font-semibold">
              {t("client.payments.recorded")}
            </h2>
            <PaymentsTable
              payments={payments.data.payments}
              showProject
              onViewReceipt={setReceipt}
            />
          </section>
        </>
      )}

      <ReceiptSheet receiptNumber={receipt} onClose={() => setReceipt(null)} />
    </div>
  );
}
