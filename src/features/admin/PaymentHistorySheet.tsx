import { useTranslation } from "react-i18next";
import { StatusBadge } from "@/components/StatusBadge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/Sheet";
import type { StaffPayment } from "@/features/operator/api";
import { useLanguage } from "@/hooks/useLanguage";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { formatDate, formatDateTime, formatTzs } from "@/lib/format";

interface PaymentHistorySheetProps {
  /** The original payment; null closes the sheet. */
  original: StaffPayment | null;
  /** All finance rows, to find the corrections that point at it. */
  entries: StaffPayment[];
  onClose: () => void;
}

/** A payment exactly as first recorded, then every correction made to it, oldest first. */
export function PaymentHistorySheet({ original, entries, onClose }: PaymentHistorySheetProps) {
  const { t } = useTranslation();
  const language = useLanguage();
  const wide = useMediaQuery("(min-width: 640px)");
  const corrections = original
    ? entries
        .filter((entry) => entry.corrects === original.receiptNumber)
        .sort((a, b) => a.receivedAt.localeCompare(b.receivedAt))
    : [];

  return (
    <Sheet open={original !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side={wide ? "right" : "bottom"}>
        {original && (
          <>
            <SheetHeader>
              <SheetTitle>
                {t("finance.historyTitle", { number: original.receiptNumber })}
              </SheetTitle>
              <SheetDescription>{t("finance.historyBody")}</SheetDescription>
            </SheetHeader>
            <ol className="space-y-4">
              <li className="space-y-2 rounded-lg border border-border bg-surface p-4">
                <p className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-medium tracking-wide text-muted uppercase">
                    {t("finance.original")}
                  </span>
                  <StatusBadge kind="payment" status={original.status} />
                </p>
                <p className="tabular text-2xl font-semibold">
                  {formatTzs(original.amount, language)}
                </p>
                <p className="text-sm text-muted">
                  {original.clientName} · {original.projectTitle}
                </p>
                <p className="text-sm text-muted">
                  {[t(`client.methods.${original.method}`), original.reference]
                    .filter(Boolean)
                    .join(" · ")}{" "}
                  · {formatDate(original.receivedAt, language)}
                </p>
                <p className="text-sm text-muted">
                  {t("finance.recordedBy", { name: original.recordedBy })}
                </p>
              </li>
              {corrections.map((correction) => (
                <li
                  key={correction.id}
                  className="space-y-2 rounded-lg border border-border bg-surface-muted p-4"
                >
                  <p className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{correction.receiptNumber}</span>
                    <StatusBadge
                      kind="correction"
                      status={correction.kind === "REVERSAL" ? "REVERSAL" : "ADJUSTMENT"}
                    />
                  </p>
                  <p className="tabular text-lg font-semibold">
                    {formatTzs(correction.amount, language)}
                  </p>
                  <p className="text-sm text-muted">
                    {t("finance.correctedBy", {
                      name: correction.recordedBy,
                      date: formatDateTime(correction.receivedAt, language),
                    })}
                  </p>
                  <p className="text-sm">{correction.reason}</p>
                </li>
              ))}
              {corrections.length === 0 && (
                <li className="text-sm text-muted">{t("finance.noCorrections")}</li>
              )}
            </ol>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
