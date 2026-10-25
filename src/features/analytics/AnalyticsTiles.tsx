import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import type { ExpenseRole } from "@/features/expenses/queries";
import { StatTile } from "@/features/operator/StatTile";
import { useLanguage } from "@/hooks/useLanguage";
import { formatBasisPoints, formatTzs } from "@/lib/format";
import { isAdminAnalytics, type Analytics } from "./analytics";

/**
 * The period's totals, each with its rule. Fixed costs exist only in the
 * admin's figures; an operator's never contain them.
 */
export function AnalyticsTiles({ role, data }: { role: ExpenseRole; data: Analytics }) {
  const { t } = useTranslation();
  const language = useLanguage();
  const money = (amount: number) => formatTzs(amount, language);

  return (
    <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatTile
        label={t("analytics.tiles.collected")}
        value={money(data.collected)}
        rule={t("analytics.tiles.collectedRule")}
      />
      <StatTile
        label={t("analytics.tiles.agreed")}
        value={money(data.agreedValue)}
        rule={t("analytics.tiles.agreedRule")}
      />
      <StatTile
        label={t("analytics.tiles.outstanding")}
        value={money(data.outstanding)}
        rule={t("analytics.tiles.outstandingRule")}
      />
      <StatTile
        label={t("analytics.tiles.awaiting")}
        value={money(data.awaitingApproval.amount)}
        rule={t("analytics.tiles.awaitingRule", { count: data.awaitingApproval.count })}
        action={
          role === "ADMIN" && data.awaitingApproval.count > 0 ? (
            <Link
              to="/admin/finance?tab=expenses&status=PENDING"
              className="font-medium text-brand-text underline underline-offset-4"
            >
              {t("analytics.tiles.awaitingLink")}
            </Link>
          ) : undefined
        }
      />
      {isAdminAnalytics(data) && (
        <StatTile
          label={t("analytics.tiles.fixed")}
          value={money(data.fixedExpenses)}
          rule={t("analytics.tiles.fixedRule")}
        />
      )}
      <StatTile
        label={t("analytics.tiles.variable")}
        value={money(data.variableExpenses)}
        rule={t("analytics.tiles.variableRule")}
      />
      <StatTile
        label={t("analytics.tiles.profit")}
        value={money(data.profit)}
        rule={t(`analytics.tiles.profitRule.${role}`)}
      />
      <StatTile
        label={t("analytics.tiles.margin")}
        value={
          data.marginBasisPoints === null
            ? "—"
            : formatBasisPoints(data.marginBasisPoints, language)
        }
        rule={
          data.marginBasisPoints === null
            ? t("analytics.tiles.marginNone")
            : t("analytics.tiles.marginRule")
        }
      />
    </dl>
  );
}
