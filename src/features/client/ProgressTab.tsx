import { ListChecks } from "lucide-react";
import { useTranslation } from "react-i18next";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { Timeline } from "@/components/Timeline";
import { useProjectId } from "./project-tabs";
import { useProgress } from "./queries";

/** Progress updates the team made visible to the client, newest first. */
export function ProgressTab() {
  const { t } = useTranslation();
  const progress = useProgress(useProjectId());

  if (progress.isError) {
    return <ErrorState error={progress.error} onRetry={() => void progress.refetch()} />;
  }

  return (
    <Timeline
      loading={progress.isPending}
      items={(progress.data ?? []).map((update) => ({
        id: update.id,
        title: update.title,
        date: update.date,
        meta: update.author,
        description: (
          <>
            <p>{update.summary}</p>
            {update.nextStep && (
              <p className="mt-1">
                <span className="font-medium text-foreground">{t("client.progress.next")}</span>{" "}
                {update.nextStep}
              </p>
            )}
          </>
        ),
      }))}
      empty={
        <EmptyState
          icon={ListChecks}
          title={t("client.progress.empty")}
          description={t("client.progress.emptyBody")}
        />
      }
    />
  );
}
