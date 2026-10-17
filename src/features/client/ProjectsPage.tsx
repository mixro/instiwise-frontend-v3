import { FolderKanban } from "lucide-react";
import { useTranslation } from "react-i18next";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { PageHeader } from "@/components/PageHeader";
import { Skeleton } from "@/components/ui/Skeleton";
import { ProjectCard } from "./ProjectCard";
import { useProjects } from "./queries";

export function ProjectsPage() {
  const { t } = useTranslation();
  const projects = useProjects();

  return (
    <div className="space-y-6">
      <PageHeader title={t("client.projects.title")} />

      {projects.isPending && (
        <div aria-busy="true" className="space-y-2">
          {[0, 1, 2].map((index) => (
            <Skeleton key={index} className="h-32 w-full rounded-lg" />
          ))}
        </div>
      )}

      {projects.isError && (
        <ErrorState error={projects.error} onRetry={() => void projects.refetch()} />
      )}

      {projects.data?.length === 0 && (
        <EmptyState
          icon={FolderKanban}
          title={t("client.projects.empty")}
          description={t("client.projects.emptyBody")}
        />
      )}

      {projects.data && projects.data.length > 0 && (
        <ul className="space-y-2">
          {projects.data.map((project) => (
            <li key={project.id}>
              <ProjectCard project={project} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
