import { ChevronRight, MessageSquare } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { StatusBadge } from "@/components/StatusBadge";
import { useLanguage } from "@/hooks/useLanguage";
import { formatDate, formatTzs } from "@/lib/format";
import type { ProjectSummary } from "./api";

/** One project in the list: the whole card is the link (a 44 px+ target on phones). */
export function ProjectCard({ project }: { project: ProjectSummary }) {
  const { t } = useTranslation();
  const language = useLanguage();

  const money =
    project.agreedAmount === 0
      ? t("client.money.notAgreedYet")
      : project.balance === 0
        ? t("client.money.fullyPaid")
        : t("client.money.toPay", { amount: formatTzs(project.balance, language) });

  return (
    <Link
      to={`/client/projects/${project.id}/overview`}
      className="flex items-center gap-4 rounded-lg border border-border bg-surface p-4 transition-colors hover:bg-surface-muted"
    >
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge kind="project" status={project.status} />
          {project.unreadMessages > 0 && (
            <span className="inline-flex h-6 items-center gap-1 rounded-md bg-brand-soft px-2 text-xs font-medium text-brand-text">
              <MessageSquare className="size-3.5" aria-hidden="true" />
              {t("client.messages.unread", { count: project.unreadMessages })}
            </span>
          )}
        </div>
        <p className="font-medium">{project.title}</p>
        <p className="text-sm text-muted">
          {project.reference} · {t("client.project.deadline")}{" "}
          {formatDate(project.deadline, language)}
        </p>
        <p className="tabular text-sm font-medium">{money}</p>
      </div>
      <ChevronRight className="size-5 shrink-0 text-muted" aria-hidden="true" />
    </Link>
  );
}
