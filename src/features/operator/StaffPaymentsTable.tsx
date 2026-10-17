import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { MoneyCell } from "@/components/MoneyCell";
import { EntryStatus } from "@/features/receipts/EntryStatus";
import { useLanguage } from "@/hooks/useLanguage";
import { formatDate } from "@/lib/format";
import type { StaffPayment } from "./api";

interface StaffPaymentsTableProps {
  payments: StaffPayment[];
  /** Hide the client column on a client's own page. */
  showClient?: boolean;
  loading?: boolean;
}

/** Payment records with links to their receipts. Cards on phones, a table from sm. */
export function StaffPaymentsTable({
  payments,
  showClient = true,
  loading,
}: StaffPaymentsTableProps) {
  const { t } = useTranslation();
  const language = useLanguage();

  const columns: DataTableColumn<StaffPayment>[] = [
    {
      id: "receipt",
      header: t("client.payments.receipt"),
      cell: (payment) =>
        payment.kind !== "PAYMENT" ? (
          <span className="font-medium whitespace-nowrap">{payment.receiptNumber}</span>
        ) : (
          <Link
            to={`/operator/payments/receipts/${payment.receiptNumber}`}
            className="inline-flex min-h-11 items-center font-medium whitespace-nowrap text-brand-text underline underline-offset-4 hover:no-underline sm:min-h-0"
          >
            {payment.receiptNumber}
          </Link>
        ),
      sortValue: (payment) => payment.receiptNumber,
      mobile: "title",
    },
    {
      id: "amount",
      header: t("client.payments.amount"),
      cell: (payment) => <MoneyCell amount={payment.amount} />,
      sortValue: (payment) => payment.amount,
      numeric: true,
    },
    {
      id: "date",
      header: t("client.payments.received"),
      cell: (payment) => (
        <span className="whitespace-nowrap">{formatDate(payment.receivedAt, language)}</span>
      ),
      sortValue: (payment) => payment.receivedAt,
    },
    ...(showClient
      ? [
          {
            id: "client",
            header: t("operator.payments.client"),
            cell: (payment: StaffPayment) => payment.clientName,
            sortValue: (payment: StaffPayment) => payment.clientName,
          },
        ]
      : []),
    {
      id: "project",
      header: t("client.payments.project"),
      cell: (payment) => payment.projectTitle,
      sortValue: (payment) => payment.projectTitle,
    },
    {
      id: "method",
      header: t("client.payments.method"),
      cell: (payment) =>
        [t(`client.methods.${payment.method}`), payment.reference].filter(Boolean).join(" · "),
    },
    {
      id: "status",
      header: t("client.payments.status"),
      cell: (payment) => <EntryStatus entry={payment} />,
    },
  ];

  return (
    <DataTable
      caption={t("operator.payments.caption")}
      columns={columns}
      rows={payments}
      rowKey={(payment) => payment.id}
      loading={loading}
      defaultSort={{ columnId: "date", direction: "desc" }}
      empty={{
        title: t("client.payments.empty"),
        description: t("operator.payments.emptyBody"),
      }}
    />
  );
}
