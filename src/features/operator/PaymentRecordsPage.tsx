import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { ErrorState } from "@/components/ErrorState";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/Button";
import { useOperatorPayments } from "./queries";
import { StaffPaymentsTable } from "./StaffPaymentsTable";

/** Payments recorded for the operator's assigned clients. */
export function PaymentRecordsPage() {
  const { t } = useTranslation();
  const payments = useOperatorPayments();

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("nav.operator.payments")}
        description={t("operator.payments.subtitle")}
        actions={
          <Button asChild variant="primary">
            <Link to="/operator/payments/new">{t("operator.record.cta")}</Link>
          </Button>
        }
      />
      {payments.isError ? (
        <ErrorState error={payments.error} onRetry={() => void payments.refetch()} />
      ) : (
        <StaffPaymentsTable payments={payments.data ?? []} loading={payments.isPending} />
      )}
    </div>
  );
}
