import { CircleCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/hooks/useLanguage";
import { cn } from "@/lib/cn";
import { formatTzs } from "@/lib/format";
import type { Balance } from "./api";

/**
 * Agreed, paid and outstanding, exactly as the server computed them.
 * Fully paid and credit (overpayment) are said in words, never shown as a 0 or a negative.
 */
export function BalanceSummary({ totals, className }: { totals: Balance; className?: string }) {
  const { t } = useTranslation();
  const language = useLanguage();
  const fullyPaid = totals.agreedAmount > 0 && totals.balance === 0;

  return (
    <div className={cn("rounded-lg border border-border bg-surface p-4", className)}>
      {fullyPaid ? (
        <p className="flex items-center gap-2 text-base font-semibold text-brand-text">
          <CircleCheck className="size-5" aria-hidden="true" />
          {t("client.money.fullyPaid")}
        </p>
      ) : (
        <div>
          <p className="text-sm text-muted">{t("client.money.outstanding")}</p>
          <p className="tabular text-2xl font-semibold tracking-tight">
            {formatTzs(totals.balance, language)}
          </p>
        </div>
      )}
      <dl className="mt-4 grid grid-cols-2 gap-4 border-t border-border pt-4 text-sm">
        <div>
          <dt className="text-muted">{t("client.money.paid")}</dt>
          <dd className="tabular font-medium">{formatTzs(totals.paidAmount, language)}</dd>
        </div>
        <div>
          <dt className="text-muted">{t("client.money.agreed")}</dt>
          <dd className="tabular font-medium">{formatTzs(totals.agreedAmount, language)}</dd>
        </div>
        {totals.credit > 0 && (
          <div className="col-span-2">
            <dt className="text-muted">{t("client.money.credit")}</dt>
            <dd className="tabular font-medium">{formatTzs(totals.credit, language)}</dd>
          </div>
        )}
      </dl>
    </div>
  );
}
