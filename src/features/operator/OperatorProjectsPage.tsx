import { ChevronRight, FolderKanban, FolderPlus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { useOperatorProjects } from "@/features/changes/queries";
import { useMayCreateProjects } from "@/features/projects/queries";

/** Drafts and agreements waiting for the client open on the agreement page. */
const opensAgreement = (status: string) =>
  status === "DRAFT" || status === "AWAITING_CLIENT_ACCEPTANCE";

/**
 * The operator's assigned projects (ADR 0002: assigned clients only). Operators an
 * admin allowed to create projects also get "New project" here.
 */
export function OperatorProjectsPage() {
  const { t } = useTranslation();
  const projects = useOperatorProjects();
  const mayCreate = useMayCreateProjects("OPERATOR");

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("nav.operator.projects")}
        description={t("operator.projects.subtitle")}
        actions={
          mayCreate && (
            <Button asChild variant="primary">
              <Link to="/operator/projects/new">
                <FolderPlus className="size-4" aria-hidden="true" />
                {t("projects.new")}
              </Link>
            </Button>
          )
        }
      />

      {projects.isPending && (
        <div aria-busy="true" className="space-y-2">
          <Skeleton className="h-20 w-full rounded-lg" />
          <Skeleton className="h-20 w-full rounded-lg" />
        </div>
      )}
      {projects.isError && (
        <ErrorState error={projects.error} onRetry={() => void projects.refetch()} />
      )}
      {projects.data?.length === 0 && (
        <EmptyState icon={FolderKanban} title={t("operator.projects.empty")} />
      )}
      {projects.data && projects.data.length > 0 && (
        <ul className="space-y-2">
          {projects.data.map((project) => (
            <li key={project.id}>
              <Link
                to={
                  opensAgreement(project.status)
                    ? `/operator/projects/${project.id}/agreement`
                    : `/operator/projects/${project.id}/changes`
                }
                className="flex items-center gap-4 rounded-lg border border-border bg-surface p-4 hover:bg-surface-muted"
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="font-medium">{project.title}</p>
                  <p className="text-sm text-muted">
                    {project.reference} · {project.clientName}
                  </p>
                  <span className="inline-flex flex-wrap gap-1">
                    <StatusBadge kind="project" status={project.status} />
                  </span>
                  {project.openChange && (
                    <span className="inline-flex h-6 items-center rounded-md bg-warning-bg px-2 text-xs font-medium text-warning-fg">
                      {t("operator.projects.changeOpen")}
                    </span>
                  )}
                </div>
                <ChevronRight className="size-5 shrink-0 text-muted" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
