import { Plus } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useSearchParams } from "react-router-dom";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/Button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { FinanceAnalytics } from "@/features/analytics/FinanceAnalytics";
import { useErrorText } from "@/hooks/useErrorText";
import { useLanguage } from "@/hooks/useLanguage";
import { useToast } from "@/hooks/useToast";
import { formatTzs } from "@/lib/format";
import { expensesApi, type Expense } from "./api";
import { ExpensesTable } from "./ExpensesTable";
import { useExpenses, useRefreshExpenses } from "./queries";

/** The operator's own expense entries: status, the reason when rejected, withdraw while pending. */
function MyExpenses() {
  const { t } = useTranslation();
  const language = useLanguage();
  const { apiError } = useErrorText();
  const { toast } = useToast();
  const refresh = useRefreshExpenses();
  const list = useExpenses("OPERATOR", {});
  const rows = list.data?.pages.flatMap((page) => page.items) ?? [];
  const summary = list.data?.pages[0];
  const [withdrawing, setWithdrawing] = useState<Expense | null>(null);
  const [withdrawError, setWithdrawError] = useState<string>();

  async function withdraw() {
    if (!withdrawing) return;
    setWithdrawError(undefined);
    try {
      await expensesApi.operator.withdraw(withdrawing.id);
      toast({
        variant: "success",
        title: t("expenses.withdrawn", { reference: withdrawing.reference }),
      });
      await refresh();
    } catch (failure) {
      setWithdrawError(apiError(failure));
      throw failure;
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {summary && (
          <p className="text-sm font-medium" aria-live="polite">
            {summary.awaitingApproval.count > 0
              ? t("expenses.waiting", {
                  count: summary.awaitingApproval.count,
                  amount: formatTzs(summary.awaitingApproval.amount, language),
                })
              : t("expenses.noneWaiting")}
          </p>
        )}
        <Button asChild variant="primary">
          <Link to="/operator/finance/expenses/new">
            <Plus className="size-4" aria-hidden="true" />
            {t("expenses.add")}
          </Link>
        </Button>
      </div>
      <ExpensesTable
        caption={t("expenses.tabs.mine")}
        rows={rows}
        loading={list.isPending}
        error={list.isError ? apiError(list.error) : undefined}
        onRetry={() => void list.refetch()}
        empty={{ title: t("expenses.empty.mine"), description: t("expenses.empty.mineBody") }}
        actions={(expense) =>
          expense.status === "PENDING" ? (
            <Button size="sm" onClick={() => setWithdrawing(expense)}>
              {t("expenses.withdraw")}
              <span className="sr-only"> {expense.reference}</span>
            </Button>
          ) : null
        }
        hasMore={list.hasNextPage}
        loadingMore={list.isFetchingNextPage}
        onShowMore={() => void list.fetchNextPage()}
      />
      <ConfirmDialog
        open={withdrawing !== null}
        onOpenChange={(open) => {
          if (!open) {
            setWithdrawing(null);
            setWithdrawError(undefined);
          }
        }}
        tone="danger"
        title={t("expenses.withdrawTitle", { reference: withdrawing?.reference ?? "" })}
        description={t("expenses.withdrawBody")}
        confirmLabel={t("expenses.withdraw")}
        error={withdrawError}
        onConfirm={withdraw}
      />
    </div>
  );
}

/**
 * The operator's Finance area. "My expenses": only the operator's own entries.
 * "Reports": their assigned clients' projects with variable costs only. Never
 * company-wide fixed costs, company totals or other clients' data (decided
 * 2026-10-25). The tab is in the URL (?tab=reports) so it can be linked to.
 */
export function OperatorFinancePage() {
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") === "reports" ? "reports" : "mine";
  return (
    <div className="space-y-6">
      <PageHeader title={t("nav.operator.finance")} description={t("expenses.subtitleOperator")} />
      <Tabs
        value={tab}
        onValueChange={(next) =>
          setParams(next === "reports" ? { tab: "reports" } : {}, { replace: true })
        }
      >
        <TabsList aria-label={t("nav.operator.finance")}>
          <TabsTrigger value="mine">{t("expenses.tabs.mine")}</TabsTrigger>
          <TabsTrigger value="reports">{t("analytics.tabs.reports")}</TabsTrigger>
        </TabsList>
        <TabsContent value="reports" className="pt-4">
          <FinanceAnalytics role="OPERATOR" />
        </TabsContent>
        <TabsContent value="mine" className="pt-4">
          <MyExpenses />
        </TabsContent>
      </Tabs>
    </div>
  );
}
