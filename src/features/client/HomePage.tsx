import { ListChecks, MessagesSquare } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { PageHeader } from "@/components/PageHeader";
import { Timeline } from "@/components/Timeline";
import { Skeleton } from "@/components/ui/Skeleton";
import { TextLink } from "@/features/auth/TextLink";
import { useSession } from "@/hooks/useSession";
import { BalanceSummary } from "./BalanceSummary";
import { useHome } from "./queries";

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

/** Balance, agreements to accept, unread messages and the latest progress, one column. */
export function HomePage() {
  const { t } = useTranslation();
  const { user } = useSession();
  const home = useHome();
  const firstName = user?.name.split(" ")[0] ?? "";

  return (
    <div className="space-y-8">
      <PageHeader
        title={t("nav.client.home")}
        description={t("client.home.greeting", { name: firstName })}
      />

      {home.isPending && (
        <div aria-busy="true" className="space-y-4">
          <Skeleton className="h-36 w-full rounded-lg" />
          <Skeleton className="h-20 w-full rounded-lg" />
          <Skeleton className="h-32 w-full rounded-lg" />
        </div>
      )}

      {home.isError && <ErrorState error={home.error} onRetry={() => void home.refetch()} />}

      {home.data && (
        <>
          {(home.data.awaitingAcceptance.length > 0 ||
            home.data.changesAwaitingDecision.length > 0) && (
            <Section id="home-actions" title={t("client.home.actions")}>
              <ul className="space-y-2">
                {home.data.awaitingAcceptance.map((item) => (
                  <li
                    key={item.projectId}
                    className="rounded-lg border border-transparent bg-warning-bg p-4 text-sm text-warning-fg"
                  >
                    <p className="font-medium">
                      {t("client.home.acceptAgreement", {
                        version: item.version,
                        project: item.projectTitle,
                      })}
                    </p>
                    <Link
                      to={`/client/projects/${item.projectId}/agreement`}
                      className="mt-1 inline-flex min-h-11 items-center font-medium underline underline-offset-4 sm:min-h-0"
                    >
                      {t("client.home.reviewAgreement")}
                    </Link>
                  </li>
                ))}
                {home.data.changesAwaitingDecision.map((item) => (
                  <li
                    key={item.number}
                    className="rounded-lg border border-transparent bg-warning-bg p-4 text-sm text-warning-fg"
                  >
                    <p className="font-medium">
                      {t("changes.client.homeAction", {
                        number: item.number,
                        project: item.projectTitle,
                      })}
                    </p>
                    <Link
                      to={`/client/projects/${item.projectId}/changes`}
                      className="mt-1 inline-flex min-h-11 items-center font-medium underline underline-offset-4 sm:min-h-0"
                    >
                      {t("changes.client.review")}
                    </Link>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          <Section id="home-balance" title={t("client.home.balance")}>
            <BalanceSummary totals={home.data.totals} />
            <p className="text-sm text-muted">
              {t("client.home.acrossProjects", { count: home.data.projectCount })}{" "}
              <TextLink to="/client/payments">{t("client.home.seePayments")}</TextLink>
            </p>
          </Section>

          <Section id="home-messages" title={t("client.home.unread")}>
            {home.data.unread.length === 0 ? (
              <EmptyState icon={MessagesSquare} title={t("client.home.noUnread")} />
            ) : (
              <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
                {home.data.unread.map((item) => (
                  <li key={item.projectId}>
                    <Link
                      to={`/client/projects/${item.projectId}/messages`}
                      className="flex min-h-14 items-center justify-between gap-4 px-4 py-3 hover:bg-surface-muted"
                    >
                      <span className="font-medium">{item.projectTitle}</span>
                      <span className="inline-flex h-6 shrink-0 items-center rounded-md bg-brand-soft px-2 text-xs font-medium text-brand-text">
                        {t("client.messages.unread", { count: item.count })}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section id="home-progress" title={t("client.home.progress")}>
            <div className="rounded-lg border border-border bg-surface p-4">
              <Timeline
                items={home.data.latestProgress.map((update) => ({
                  id: update.id,
                  title: update.title,
                  date: update.date,
                  meta: update.projectTitle,
                  description: update.summary,
                }))}
                empty={<EmptyState icon={ListChecks} title={t("client.progress.empty")} />}
              />
            </div>
          </Section>
        </>
      )}
    </div>
  );
}
