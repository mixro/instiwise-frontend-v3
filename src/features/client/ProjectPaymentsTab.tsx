import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ErrorState } from "@/components/ErrorState";
import { Skeleton } from "@/components/ui/Skeleton";
import { BalanceSummary } from "./BalanceSummary";
import { PaymentsTable } from "./PaymentsTable";
import { useProjectId } from "./project-tabs";
import { ReceiptSheet } from "./ReceiptSheet";
import { useProjectPayments } from "./queries";

export function ProjectPaymentsTab() {
  const { t } = useTranslation();
  const payments = useProjectPayments(useProjectId());
  const [receipt, setReceipt] = useState<string | null>(null);

  if (payments.isPending) {
    return (
      <div aria-busy="true" className="space-y-4">
        <Skeleton className="h-36 w-full rounded-lg" />
        <Skeleton className="h-24 w-full rounded-lg" />
      </div>
    );
  }
  if (payments.isError) {
    return <ErrorState error={payments.error} onRetry={() => void payments.refetch()} />;
  }

  return (
    <div className="space-y-6">
      {payments.data.totals.agreedAmount === 0 ? (
        <p className="text-sm text-muted">{t("client.money.notAgreedYet")}</p>
      ) : (
        <BalanceSummary totals={payments.data.totals} />
      )}
      <p className="text-sm text-muted">{t("client.payments.external")}</p>
      <PaymentsTable payments={payments.data.payments} onViewReceipt={setReceipt} />
      <ReceiptSheet receiptNumber={receipt} onClose={() => setReceipt(null)} />
    </div>
  );
}
