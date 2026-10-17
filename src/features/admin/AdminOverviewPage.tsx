import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { ErrorState } from "@/components/ErrorState";
import { PageHeader } from "@/components/PageHeader";
import { Skeleton } from "@/components/ui/Skeleton";
import { StatTile } from "@/features/operator/StatTile";
import { useLanguage } from "@/hooks/useLanguage";
import { formatMonth, formatTzs } from "@/lib/format";
import { AuditList } from "./AuditList";
import { useAdminOverview } from "./queries";

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

function ActionLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link
      to={to}
      className="flex min-h-14 items-center justify-between gap-4 rounded-lg bg-warning-bg px-4 py-3 text-sm font-medium text-warning-fg hover:underline"
    >
      {children}
      <ChevronRight className="size-4 shrink-0" aria-hidden="true" />
    </Link>
  );
}

/** System-wide figures (admins only), what needs an admin, and the latest activity. */
export function AdminOverviewPage() {
  const { t } = useTranslation();
  const language = useLanguage();
  const overview = useAdminOverview();
  const data = overview.data;

  return (
    <div className="space-y-8">
      <PageHeader title={t("nav.admin.overview")} description={t("admin.overview.scope")} />

      {overview.isPending && (
        <div aria-busy="true" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3, 4, 5, 6, 7].map((index) => (
            <Skeleton key={index} className="h-28 w-full rounded-lg" />
          ))}
        </div>
      )}
      {overview.isError && (
        <ErrorState error={overview.error} onRetry={() => void overview.refetch()} />
      )}

      {data && (
        <>
          {(data.pendingOperatorCount > 0 ||
            data.unassignedClientCount > 0 ||
            data.changesWaitingForAdmin > 0) && (
            <Section id="admin-needs" title={t("admin.overview.needsYou")}>
              <div className="grid gap-2 sm:grid-cols-3">
                {data.pendingOperatorCount > 0 && (
                  <ActionLink to="/admin/operators">
                    {t("admin.overview.pendingOperators", { count: data.pendingOperatorCount })}
                  </ActionLink>
                )}
                {data.unassignedClientCount > 0 && (
                  <ActionLink to="/admin/clients">
                    {t("admin.overview.unassigned", { count: data.unassignedClientCount })}
                  </ActionLink>
                )}
                {data.changesWaitingForAdmin > 0 && (
                  <ActionLink to="/admin/projects/changes">
                    {t("changes.admin.waitingCount", { count: data.changesWaitingForAdmin })}
                  </ActionLink>
                )}
              </div>
            </Section>
          )}

          <Section id="admin-people" title={t("admin.overview.people")}>
            <dl className="grid gap-4 sm:grid-cols-3">
              <StatTile
                label={t("nav.admin.clients")}
                value={data.clientCount}
                rule={t("admin.overview.clientsRule", { count: data.unassignedClientCount })}
              />
              <StatTile
                label={t("admin.overview.activeOperators")}
                value={data.activeOperatorCount}
                rule={t("admin.overview.operatorsRule", { count: data.pendingOperatorCount })}
              />
              <StatTile
                label={t("operator.dashboard.activeProjects")}
                value={data.activeProjectCount}
                rule={t("admin.overview.projectsRule", { count: data.projectCount })}
              />
            </dl>
          </Section>

          <Section id="admin-money" title={t("operator.dashboard.money")}>
            <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatTile
                label={t("client.money.outstanding")}
                value={formatTzs(data.totals.balance, language)}
                rule={t("admin.overview.allTimeRule")}
              />
              <StatTile
                label={t("operator.dashboard.collected")}
                value={formatTzs(data.totals.paidAmount, language)}
                rule={t("admin.overview.collectedRule")}
              />
              <StatTile
                label={t("client.money.agreed")}
                value={formatTzs(data.totals.agreedAmount, language)}
                rule={t("admin.overview.allTimeRule")}
              />
              <StatTile
                label={t("operator.dashboard.recordedThisMonth")}
                value={formatTzs(data.recordedThisMonth.amount, language)}
                rule={t("admin.overview.monthRule", {
                  month: formatMonth(data.recordedThisMonth.month, language),
                  count: data.recordedThisMonth.count,
                  corrections: data.correctionsThisMonth,
                })}
              />
            </dl>
            <p className="text-xs text-muted">{t("operator.dashboard.notProfit")}</p>
          </Section>

          <Section id="admin-activity" title={t("admin.overview.activity")}>
            <AuditList entries={data.recentActivity} empty={{ title: t("audit.empty") }} />
            <Link
              to="/admin/audit-logs"
              className="inline-flex min-h-11 items-center text-sm font-medium text-brand-text underline underline-offset-4 sm:min-h-0"
            >
              {t("admin.overview.allActivity")}
            </Link>
          </Section>
        </>
      )}
    </div>
  );
}
