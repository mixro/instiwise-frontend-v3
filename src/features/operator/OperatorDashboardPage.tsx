import { CalendarClock, Receipt } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { useLanguage } from "@/hooks/useLanguage";
import { formatDate, formatMonth, formatTzs } from "@/lib/format";
import { useOperatorDashboard } from "./queries";
import { StaffPaymentsTable } from "./StaffPaymentsTable";
import { StatTile } from "./StatTile";

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="space-y-3">
      <h2 id={id} className="text-base font-semibold">
        {title}
      </h2>
      {children}
    </section>
  );
}

/**
 * Counts and money over the operator's assigned clients only (ADR 0002). Every
 * figure states its rule; the server computes them all.
 */
export function OperatorDashboardPage() {
  const { t } = useTranslation();
  const language = useLanguage();
  const dashboard = useOperatorDashboard();
  const data = dashboard.data;

  return (
    <div className="space-y-8">
      <PageHeader
        title={t("nav.operator.dashboard")}
        description={t("operator.dashboard.scope")}
        actions={
          <Button asChild variant="primary">
            <Link to="/operator/payments/new">{t("operator.record.cta")}</Link>
          </Button>
        }
      />

      {dashboard.isPending && (
        <div aria-busy="true" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((index) => (
            <Skeleton key={index} className="h-28 w-full rounded-lg" />
          ))}
        </div>
      )}
      {dashboard.isError && (
        <ErrorState error={dashboard.error} onRetry={() => void dashboard.refetch()} />
      )}

      {data && (
        <>
          <Section id="dash-work" title={t("operator.dashboard.work")}>
            <dl className="grid gap-4 sm:grid-cols-3">
              <StatTile
                label={t("operator.dashboard.clients")}
                value={data.clientCount}
                rule={t("operator.dashboard.clientsRule")}
              />
              <StatTile
                label={t("operator.dashboard.activeProjects")}
                value={data.activeProjectCount}
                rule={t("operator.dashboard.activeRule", { count: data.projectCount })}
              />
              <StatTile
                label={t("operator.dashboard.openChanges")}
                value={data.openChangeCount}
                rule={t("operator.dashboard.openChangesRule")}
              />
            </dl>
          </Section>

          <Section id="dash-money" title={t("operator.dashboard.money")}>
            <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatTile
                label={t("client.money.outstanding")}
                value={formatTzs(data.totals.balance, language)}
                rule={t("operator.dashboard.allTimeRule")}
              />
              <StatTile
                label={t("operator.dashboard.collected")}
                value={formatTzs(data.totals.paidAmount, language)}
                rule={t("operator.dashboard.allTimeRule")}
              />
              <StatTile
                label={t("client.money.agreed")}
                value={formatTzs(data.totals.agreedAmount, language)}
                rule={t("operator.dashboard.allTimeRule")}
              />
              <StatTile
                label={t("operator.dashboard.recordedThisMonth")}
                value={formatTzs(data.recordedThisMonth.amount, language)}
                rule={t("operator.dashboard.monthRule", {
                  month: formatMonth(data.recordedThisMonth.month, language),
                  count: data.recordedThisMonth.count,
                })}
              />
            </dl>
            <p className="text-xs text-muted">{t("operator.dashboard.notProfit")}</p>
          </Section>

          <Section id="dash-deadlines" title={t("operator.dashboard.deadlines")}>
            {data.upcomingDeadlines.length === 0 ? (
              <EmptyState icon={CalendarClock} title={t("operator.dashboard.noDeadlines")} />
            ) : (
              <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
                {data.upcomingDeadlines.map((item) => (
                  <li key={item.projectId}>
                    <Link
                      to={`/operator/projects/${item.projectId}/changes`}
                      className="flex min-h-14 flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-3 hover:bg-surface-muted"
                    >
                      <span>
                        <span className="block font-medium">{item.title}</span>
                        <span className="block text-sm text-muted">{item.clientName}</span>
                      </span>
                      <span className="text-sm font-medium whitespace-nowrap">
                        {formatDate(item.deadline, language)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section id="dash-payments" title={t("operator.dashboard.recentPayments")}>
            {data.recentPayments.length === 0 ? (
              <EmptyState icon={Receipt} title={t("client.payments.empty")} />
            ) : (
              <StaffPaymentsTable payments={data.recentPayments} />
            )}
          </Section>
        </>
      )}
    </div>
  );
}
