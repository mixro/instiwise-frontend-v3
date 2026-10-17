import { useTranslation } from "react-i18next";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { MoneyCell } from "@/components/MoneyCell";
import { EntryStatus } from "@/features/receipts/EntryStatus";
import { useLanguage } from "@/hooks/useLanguage";
import { formatDate } from "@/lib/format";
import type { Payment } from "./api";

interface PaymentsTableProps {
  payments: Payment[];
  /** Show which project each payment belongs to (the all-projects page). */
  showProject?: boolean;
  onViewReceipt: (receiptNumber: string) => void;
}

/** Recorded payments with their receipts. Cards on phones, a table from sm. */
export function PaymentsTable({ payments, showProject, onViewReceipt }: PaymentsTableProps) {
  const { t } = useTranslation();
  const language = useLanguage();

  const columns: DataTableColumn<Payment>[] = [
    {
      id: "receipt",
      header: t("client.payments.receipt"),
      cell: (payment) =>
        payment.kind !== "PAYMENT" ? (
          <span className="font-medium whitespace-nowrap">{payment.receiptNumber}</span>
        ) : (
          <button
            type="button"
            onClick={() => onViewReceipt(payment.receiptNumber)}
            aria-label={t("client.payments.viewReceipt", { number: payment.receiptNumber })}
            className="inline-flex min-h-11 items-center rounded-md font-medium whitespace-nowrap text-brand-text underline underline-offset-4 hover:no-underline sm:min-h-0"
          >
            {payment.receiptNumber}
          </button>
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
    ...(showProject
      ? [
          {
            id: "project",
            header: t("client.payments.project"),
            cell: (payment: Payment) => payment.projectTitle,
            sortValue: (payment: Payment) => payment.projectTitle,
          },
        ]
      : []),
    {
      id: "method",
      header: t("client.payments.method"),
      cell: (payment) => t(`client.methods.${payment.method}`),
    },
    {
      id: "status",
      header: t("client.payments.status"),
      // Shown on phones too: a reversed payment must not look like a normal one.
      cell: (payment) => <EntryStatus entry={payment} />,
    },
  ];

  return (
    <DataTable
      caption={t("client.payments.caption")}
      columns={columns}
      rows={payments}
      rowKey={(payment) => payment.id}
      defaultSort={{ columnId: "date", direction: "desc" }}
      empty={{
        title: t("client.payments.empty"),
        description: t("client.payments.emptyBody"),
      }}
    />
  );
}
