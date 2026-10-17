import { ArrowLeft, Mail, MessageCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";
import { ErrorState } from "@/components/ErrorState";
import { MoneyCell } from "@/components/MoneyCell";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { BalanceSummary } from "@/features/client/BalanceSummary";
import { NotFound } from "@/features/shell/NotFound";
import { useLanguage } from "@/hooks/useLanguage";
import { ApiError } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { formatTzPhone, whatsAppUrl } from "@/lib/phone";
import { useOperatorClient } from "./queries";
import { StaffPaymentsTable } from "./StaffPaymentsTable";

/** One assigned client: contact, money, projects and payments. Unassigned: 404. */
export function OperatorClientPage() {
  const { t } = useTranslation();
  const language = useLanguage();
  const clientId = useParams().clientId ?? "";
  const detail = useOperatorClient(clientId);

  if (detail.error instanceof ApiError && detail.error.status === 404) return <NotFound />;

  return (
    <div className="space-y-6">
      <Link
        to="/operator/clients"
        className="-ml-1 inline-flex min-h-11 items-center gap-1 rounded-md px-1 text-sm text-muted hover:text-foreground sm:min-h-0"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        {t("nav.operator.clients")}
      </Link>

      {detail.isPending && (
        <div aria-busy="true" className="space-y-4">
          <Skeleton className="h-10 w-1/2" />
          <Skeleton className="h-36 w-full rounded-lg" />
        </div>
      )}
      {detail.isError && <ErrorState error={detail.error} onRetry={() => void detail.refetch()} />}

      {detail.data && (
        <>
          <PageHeader
            title={detail.data.client.name}
            description={detail.data.client.email}
            actions={
              <Button asChild variant="primary">
                <Link to={`/operator/payments/new?client=${detail.data.client.id}`}>
                  {t("operator.record.cta")}
                </Link>
              </Button>
            }
          />

          <div className="flex flex-wrap gap-2">
            {detail.data.client.phone && (
              <Button asChild>
                <a
                  href={whatsAppUrl(detail.data.client.phone)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MessageCircle className="size-4" aria-hidden="true" />
                  {t("operator.client.whatsapp", {
                    phone: formatTzPhone(detail.data.client.phone),
                  })}
                </a>
              </Button>
            )}
            <Button asChild variant="ghost">
              <a href={`mailto:${detail.data.client.email}`}>
                <Mail className="size-4" aria-hidden="true" />
                {t("operator.client.email")}
              </a>
            </Button>
          </div>

          <section aria-labelledby="client-money" className="space-y-3">
            <h2 id="client-money" className="text-base font-semibold">
              {t("operator.dashboard.money")}
            </h2>
            <BalanceSummary totals={detail.data.client} />
          </section>

          <section aria-labelledby="client-projects" className="space-y-3">
            <h2 id="client-projects" className="text-base font-semibold">
              {t("operator.clients.projects")}
            </h2>
            <ul className="space-y-2">
              {detail.data.projects.map((project) => (
                <li key={project.id}>
                  <Link
                    to={`/operator/projects/${project.id}/changes`}
                    className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-border bg-surface p-4 hover:bg-surface-muted"
                  >
                    <span className="min-w-0 space-y-1">
                      <span className="block font-medium">{project.title}</span>
                      <span className="block text-sm text-muted">
                        {project.reference} · {t("client.project.deadline")}{" "}
                        {formatDate(project.deadline, language)}
                      </span>
                      <StatusBadge kind="project" status={project.status} />
                    </span>
                    <span className="text-right text-sm">
                      <span className="block text-muted">{t("client.money.outstanding")}</span>
                      <MoneyCell amount={project.balance} className="font-medium" />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="client-payments" className="space-y-3">
            <h2 id="client-payments" className="text-base font-semibold">
              {t("nav.operator.payments")}
            </h2>
            <StaffPaymentsTable payments={detail.data.payments} showClient={false} />
          </section>
        </>
      )}
    </div>
  );
}
