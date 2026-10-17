import { ArrowLeft, GitCompareArrows } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { ChangeHistory } from "@/features/changes/ChangeHistory";
import { useOperatorChanges, useOperatorProject } from "@/features/changes/queries";
import { NotFound } from "@/features/shell/NotFound";
import { useLanguage } from "@/hooks/useLanguage";
import { ApiError } from "@/lib/api";
import { formatDate, formatTzs } from "@/lib/format";
import { ProposeChangeForm } from "./ProposeChangeForm";

/** One assigned project: its accepted terms, a proposal form, and every change so far. */
export function OperatorChangesPage() {
  const { t } = useTranslation();
  const language = useLanguage();
  const projectId = useParams().projectId ?? "";
  const project = useOperatorProject(projectId);
  const changes = useOperatorChanges(projectId);
  const [proposing, setProposing] = useState(false);

  if (project.error instanceof ApiError && project.error.status === 404) return <NotFound />;

  const terms = project.data?.terms;

  return (
    <div className="space-y-6">
      <Link
        to="/operator/projects"
        className="-ml-1 inline-flex min-h-11 items-center gap-1 rounded-md px-1 text-sm text-muted hover:text-foreground sm:min-h-0"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        {t("nav.operator.projects")}
      </Link>

      {project.isPending && <Skeleton className="h-16 w-full rounded-lg" />}
      {project.isError && (
        <ErrorState error={project.error} onRetry={() => void project.refetch()} />
      )}

      {project.data && (
        <>
          <PageHeader
            title={project.data.title}
            description={`${project.data.reference} · ${project.data.clientName}`}
          />

          <section aria-labelledby="current-terms" className="space-y-3">
            <h2 id="current-terms" className="text-base font-semibold">
              {t("changes.operator.current")}
            </h2>
            {terms ? (
              <div className="space-y-3 rounded-lg border border-border bg-surface p-4 text-sm">
                <dl className="grid grid-cols-2 gap-4">
                  <div>
                    <dt className="text-muted">{t("changes.price")}</dt>
                    <dd className="tabular font-semibold">{formatTzs(terms.price, language)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted">{t("changes.deadline")}</dt>
                    <dd className="font-semibold">{formatDate(terms.deadline, language)}</dd>
                  </div>
                </dl>
                <ul className="list-disc space-y-1 pl-5">
                  {terms.scope.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-sm text-muted">{t("changes.operator.noAgreement")}</p>
            )}
          </section>

          {terms && (
            <section aria-labelledby="propose" className="space-y-3">
              <h2 id="propose" className="text-base font-semibold">
                {t("changes.operator.propose")}
              </h2>
              {proposing ? (
                <div className="rounded-lg border border-border bg-surface p-4">
                  <ProposeChangeForm
                    projectId={projectId}
                    current={terms}
                    onDone={() => setProposing(false)}
                  />
                </div>
              ) : project.data.openChange ? (
                <p className="text-sm text-muted">{t("changes.operator.oneOpen")}</p>
              ) : (
                <Button variant="primary" onClick={() => setProposing(true)}>
                  {t("changes.operator.propose")}
                </Button>
              )}
            </section>
          )}
        </>
      )}

      <section aria-labelledby="operator-history" className="space-y-3">
        <h2 id="operator-history" className="text-base font-semibold">
          {t("changes.history.title")}
        </h2>
        {changes.isPending && <Skeleton className="h-24 w-full rounded-lg" />}
        {changes.isError && (
          <ErrorState error={changes.error} onRetry={() => void changes.refetch()} />
        )}
        {changes.data?.length === 0 && (
          <EmptyState icon={GitCompareArrows} title={t("changes.operator.empty")} />
        )}
        {changes.data && changes.data.length > 0 && <ChangeHistory changes={changes.data} />}
      </section>
    </div>
  );
}
