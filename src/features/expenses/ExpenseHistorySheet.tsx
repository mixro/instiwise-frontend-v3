import { useTranslation } from "react-i18next";
import { StatusBadge } from "@/components/StatusBadge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/Sheet";
import { useLanguage } from "@/hooks/useLanguage";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { formatDate, formatDateTime, formatTzs } from "@/lib/format";
import type { Expense } from "./api";

interface ExpenseHistorySheetProps {
  /** The original expense; null closes the sheet. */
  original: Expense | null;
  /** The rows loaded so far, to find the corrections it lists in correctedBy. */
  rows: Expense[];
  onClose: () => void;
}

/** An expense as first entered, then every correction row made to it, oldest first. */
export function ExpenseHistorySheet({ original, rows, onClose }: ExpenseHistorySheetProps) {
  const { t } = useTranslation();
  const language = useLanguage();
  const wide = useMediaQuery("(min-width: 640px)");
  const corrections = (original?.correctedBy ?? []).map(
    (reference) => rows.find((row) => row.reference === reference) ?? reference,
  );

  return (
    <Sheet open={original !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side={wide ? "right" : "bottom"}>
        {original && (
          <>
            <SheetHeader>
              <SheetTitle>
                {t("expenses.history.title", { reference: original.reference })}
              </SheetTitle>
              <SheetDescription>{t("expenses.history.body")}</SheetDescription>
            </SheetHeader>
            <ol className="space-y-4">
              <li className="space-y-2 rounded-lg border border-border bg-surface p-4">
                <p className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-medium tracking-wide text-muted uppercase">
                    {t("finance.original")}
                  </span>
                  <StatusBadge kind="expense" status={original.status} />
                </p>
                <p className="tabular text-2xl font-semibold">
                  {formatTzs(original.amount, language)}
                </p>
                <p className="text-sm">{original.description}</p>
                <p className="text-sm text-muted">
                  {[
                    t(`expenses.kind.${original.kind}`),
                    original.category.name,
                    original.projectTitle ?? t("expenses.companyCost"),
                  ].join(" · ")}
                </p>
                <p className="text-sm text-muted">
                  {[t(`client.methods.${original.paymentMethod}`), original.referenceNumber]
                    .filter(Boolean)
                    .join(" · ")}{" "}
                  · {formatDate(original.paidOn, language)}
                </p>
                <p className="text-sm text-muted">
                  {t("expenses.history.enteredBy", {
                    name: original.enteredBy.name,
                    date: formatDateTime(original.enteredAt, language),
                  })}
                </p>
                {original.decidedBy && original.decidedAt && (
                  <p className="text-sm text-muted">
                    {t("expenses.history.decidedBy", {
                      name: original.decidedBy.name,
                      date: formatDateTime(original.decidedAt, language),
                    })}
                  </p>
                )}
              </li>
              {corrections.map((correction) =>
                typeof correction === "string" ? (
                  <li key={correction} className="text-sm text-muted">
                    {t("expenses.history.notLoaded", { reference: correction })}
                  </li>
                ) : (
                  <li
                    key={correction.id}
                    className="space-y-2 rounded-lg border border-border bg-surface-muted p-4"
                  >
                    <p className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{correction.reference}</span>
                      {correction.rowType !== "EXPENSE" && (
                        <StatusBadge kind="correction" status={correction.rowType} />
                      )}
                    </p>
                    <p className="tabular text-lg font-semibold">
                      {formatTzs(correction.amount, language)}
                    </p>
                    <p className="text-sm text-muted">
                      {t("finance.correctedBy", {
                        name: correction.enteredBy.name,
                        date: formatDateTime(correction.enteredAt, language),
                      })}
                    </p>
                    {correction.decisionReason && (
                      <p className="text-sm">{correction.decisionReason}</p>
                    )}
                  </li>
                ),
              )}
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
