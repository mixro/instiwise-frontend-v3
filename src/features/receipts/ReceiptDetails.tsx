import { useTranslation } from "react-i18next";
import { StatusBadge } from "@/components/StatusBadge";
import type { Receipt } from "@/features/client/api";
import { useLanguage } from "@/hooks/useLanguage";
import { formatDate, formatDateTime, formatTzs } from "@/lib/format";

/**
 * A receipt as the system recorded it (brief 12.4). Shared by the client's receipt
 * sheet and the operator's receipt page, so both always show the same thing.
 */
export function ReceiptDetails({
  receipt,
  showDisclaimer = true,
}: {
  receipt: Receipt;
  /** Off where the disclaimer is already shown, e.g. as the receipt sheet's description. */
  showDisclaimer?: boolean;
}) {
  const { t } = useTranslation();
  const language = useLanguage();

  const rows: [string, string][] = [
    [t("client.receipt.client"), receipt.clientName],
    [t("client.receipt.project"), `${receipt.projectTitle} (${receipt.projectReference})`],
    [t("client.receipt.received"), formatDate(receipt.receivedAt, language)],
    [
      t("client.receipt.method"),
      [t(`client.methods.${receipt.method}`), receipt.reference].filter(Boolean).join(" · "),
    ],
    [t("client.receipt.agreed"), formatTzs(receipt.agreedAmount, language)],
    [t("client.receipt.paidToDate"), formatTzs(receipt.paidToDate, language)],
    [t("client.receipt.balanceAfter"), formatTzs(receipt.balanceAfter, language)],
    [t("client.receipt.recordedBy"), receipt.recordedBy],
    [t("client.receipt.issued"), formatDateTime(receipt.issuedAt, language)],
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="tabular text-3xl font-semibold tracking-tight">
          {formatTzs(receipt.amount, language)}
        </p>
        <StatusBadge kind="payment" status={receipt.status} />
      </div>
      <dl className="divide-y divide-border rounded-lg border border-border bg-surface text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:gap-4">
            <dt className="text-muted sm:w-40 sm:shrink-0">{label}</dt>
            <dd className="tabular font-medium break-words">{value}</dd>
          </div>
        ))}
      </dl>
      {receipt.corrections.length > 0 && (
        <section aria-labelledby="receipt-corrections" className="space-y-2">
          <h3 id="receipt-corrections" className="text-sm font-semibold">
            {t("finance.correctionsTitle")}
          </h3>
          <ul className="divide-y divide-border rounded-lg border border-border bg-surface text-sm">
            {receipt.corrections.map((correction) => (
              <li key={correction.number} className="space-y-1 px-4 py-3">
                <p className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{correction.number}</span>
                  <StatusBadge kind="correction" status={correction.kind} />
                  <span className="tabular font-medium">
                    {formatTzs(correction.amount, language)}
                  </span>
                </p>
                <p className="text-muted">
                  {t("finance.correctedBy", {
                    name: correction.by,
                    date: formatDateTime(correction.at, language),
                  })}
                </p>
                <p>{correction.reason}</p>
              </li>
            ))}
          </ul>
        </section>
      )}
      {showDisclaimer && <p className="text-xs text-muted">{t("client.receipt.disclaimer")}</p>}
    </div>
  );
}
