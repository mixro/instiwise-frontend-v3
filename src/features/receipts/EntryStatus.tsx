import { useTranslation } from "react-i18next";
import { StatusBadge } from "@/components/StatusBadge";
import type { Payment } from "@/features/client/api";

/**
 * The status of a payment row (Recorded, Reversed, Adjusted), or the kind of a
 * correction row (Reversal, Adjustment) with the receipt it corrects.
 */
export function EntryStatus({ entry }: { entry: Payment }) {
  const { t } = useTranslation();
  if (entry.kind === "PAYMENT") return <StatusBadge kind="payment" status={entry.status} />;
  return (
    <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
      <StatusBadge kind="correction" status={entry.kind} />
      {entry.corrects && (
        <span className="text-xs text-muted">
          {t("finance.corrects", { number: entry.corrects })}
        </span>
      )}
    </span>
  );
}
