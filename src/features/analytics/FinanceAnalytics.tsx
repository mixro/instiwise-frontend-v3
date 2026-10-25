import { ChartColumn } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { Skeleton } from "@/components/ui/Skeleton";
import type { ExpenseRole } from "@/features/expenses/queries";
import { isEmptyPeriod } from "./analytics";
import { AnalyticsTiles } from "./AnalyticsTiles";
import { CategoryPanel } from "./CategoryPanel";
import { readPeriod } from "./period";
import { PeriodPicker } from "./PeriodPicker";
import { ProjectProfitTable } from "./ProjectProfitTable";
import { useFinanceAnalytics } from "./queries";
import type { SeriesKey } from "./series";
import { TrendPanel } from "./TrendPanel";

/**
 * Collected, expenses and profit for a period. Admins see the whole company;
 * operators see only their assigned clients' projects and variable costs (the
 * server decides which). Every figure is the server's; this only formats them.
 * The period is in the address, next to the page's own parameters (?tab=…).
 */
export function FinanceAnalytics({ role }: { role: ExpenseRole }) {
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const selection = readPeriod(params);
  const analytics = useFinanceAnalytics(role, selection.period);
  const data = analytics.data;

  const labels: Record<SeriesKey, string> = {
    collected: t("analytics.series.collected"),
    expenses:
      role === "ADMIN" ? t("analytics.series.expenses") : t("analytics.series.variableExpenses"),
    profit: t("analytics.series.profit"),
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1 rounded-lg border border-border bg-surface-muted px-4 py-3 text-sm">
        <p className="font-medium">{t(`analytics.scope.${role}`)}</p>
        <p>{t(`analytics.profitRule.${role}`)}</p>
        <p className="text-muted">{t("analytics.cashBasis")}</p>
      </div>

      <PeriodPicker
        selection={selection}
        onChange={(next) =>
          setParams(
            (current) => {
              const updated = new URLSearchParams(current);
              updated.set("period", next.period);
              for (const key of ["from", "to"] as const) {
                const value = next[key];
                if (value) updated.set(key, value);
                else updated.delete(key);
              }
              return updated;
            },
            { replace: true },
          )
        }
      />

      {analytics.isPending && selection.period && (
        <div aria-busy="true" className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[0, 1, 2, 3, 4, 5, 6, 7].map((index) => (
              <Skeleton key={index} className="h-28 w-full rounded-lg" />
            ))}
          </div>
          <Skeleton className="h-80 w-full rounded-lg" />
        </div>
      )}
      {analytics.isError && (
        <ErrorState error={analytics.error} onRetry={() => void analytics.refetch()} />
      )}

      {data && isEmptyPeriod(data) && (
        <EmptyState
          icon={ChartColumn}
          title={t("analytics.empty.title")}
          description={t("analytics.empty.body")}
        />
      )}
      {data && !isEmptyPeriod(data) && (
        <>
          <section aria-labelledby={`${role}-totals`} className="space-y-3">
            <h2 id={`${role}-totals`} className="text-base font-semibold">
              {t("analytics.tiles.heading")}
            </h2>
            <AnalyticsTiles role={role} data={data} />
          </section>

          <TrendPanel role={role} months={data.monthly} labels={labels} />
          <CategoryPanel role={role} categories={data.byCategory} label={labels.expenses} />

          <section aria-labelledby={`${role}-projects`} className="min-w-0 space-y-3">
            <h2 id={`${role}-projects`} className="text-base font-semibold">
              {t("analytics.projects.title")}
            </h2>
            <p className="text-sm text-muted">{t(`analytics.projects.note.${role}`)}</p>
            <ProjectProfitTable role={role} projects={data.projects} />
          </section>
        </>
      )}
    </div>
  );
}
