import { ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { ErrorState } from "@/components/ErrorState";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Skeleton } from "@/components/ui/Skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { NotFound } from "@/features/shell/NotFound";
import { ApiError } from "@/lib/api";
import { PROJECT_TABS, useProjectId } from "./project-tabs";
import { useProject } from "./queries";

/**
 * Project header and tabs. Each tab is its own URL (/client/projects/:id/payments),
 * so the back button and shared links work; the tab content is the nested route.
 */
export function ProjectLayout() {
  const { t } = useTranslation();
  const projectId = useProjectId();
  const project = useProject(projectId);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const current = PROJECT_TABS.find((tab) => pathname.endsWith(`/${tab}`)) ?? "overview";

  if (project.error instanceof ApiError && project.error.status === 404) return <NotFound />;

  return (
    <div className="space-y-6">
      <Link
        to="/client/projects"
        className="-ml-1 inline-flex min-h-11 items-center gap-1 rounded-md px-1 text-sm text-muted hover:text-foreground sm:min-h-0"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        {t("client.projects.title")}
      </Link>

      {project.isPending && (
        <div aria-busy="true" className="space-y-3">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-1/3" />
        </div>
      )}

      {project.isError && (
        <ErrorState error={project.error} onRetry={() => void project.refetch()} />
      )}

      {project.data && (
        <>
          <PageHeader
            title={project.data.title}
            description={project.data.reference}
            badge={<StatusBadge kind="project" status={project.data.status} />}
            className="border-b-0 pb-0"
          />
          <Tabs value={current} onValueChange={(tab) => navigate(tab)}>
            <TabsList
              aria-label={t("client.project.sections")}
              className="-mx-4 px-4 sm:mx-0 sm:px-0"
            >
              {PROJECT_TABS.map((tab) => (
                <TabsTrigger key={tab} value={tab}>
                  {t(`client.tabs.${tab}`)}
                  {tab === "changes" && project.data.changesAwaitingDecision > 0 && (
                    <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-warning-fg px-1.5 text-xs font-semibold text-surface">
                      {project.data.changesAwaitingDecision}
                      <span className="sr-only"> {t("changes.client.badge")}</span>
                    </span>
                  )}
                  {tab === "messages" && project.data.unreadMessages > 0 && (
                    <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1.5 text-xs font-semibold text-brand-fg">
                      {project.data.unreadMessages}
                      <span className="sr-only">
                        {" "}
                        {t("client.messages.unread", { count: project.data.unreadMessages })}
                      </span>
                    </span>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>
            <TabsContent value={current}>
              <Outlet />
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
