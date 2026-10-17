import { useTranslation } from "react-i18next";
import { TextLink } from "@/features/auth/TextLink";
import { useLanguage } from "@/hooks/useLanguage";
import { formatDate } from "@/lib/format";
import { BalanceSummary } from "./BalanceSummary";
import { useProjectId } from "./project-tabs";
import { WhatsAppLink } from "./WhatsAppLink";
import { useProject } from "./queries";

export function OverviewTab() {
  const { t } = useTranslation();
  const language = useLanguage();
  const projectId = useProjectId();
  // Already loaded by ProjectLayout; this reads the same cache entry.
  const { data: project } = useProject(projectId);
  if (!project) return null;

  return (
    <div className="space-y-6">
      {project.status === "AWAITING_CLIENT_ACCEPTANCE" && (
        <div className="rounded-lg bg-warning-bg p-4 text-sm text-warning-fg">
          <p className="font-medium">{t("client.overview.awaitingAcceptance")}</p>
          <TextLink to="../agreement" relative="path" className="text-warning-fg">
            {t("client.home.reviewAgreement")}
          </TextLink>
        </div>
      )}

      <p>{project.description}</p>

      <dl className="grid grid-cols-2 gap-4 rounded-lg border border-border bg-surface p-4 text-sm">
        <div>
          <dt className="text-muted">{t("client.project.start")}</dt>
          <dd className="font-medium">{formatDate(project.startDate, language)}</dd>
        </div>
        <div>
          <dt className="text-muted">{t("client.project.deadline")}</dt>
          <dd className="font-medium">{formatDate(project.deadline, language)}</dd>
        </div>
        <div className="col-span-2">
          <dt className="text-muted">{t("client.project.category")}</dt>
          <dd className="font-medium">{project.category}</dd>
        </div>
      </dl>

      <section aria-labelledby="deliverables-heading" className="space-y-2">
        <h2 id="deliverables-heading" className="text-base font-semibold">
          {t("client.overview.deliverables")}
        </h2>
        <ul className="list-disc space-y-1 pl-5 text-sm">
          {project.deliverables.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="money-heading" className="space-y-2">
        <h2 id="money-heading" className="text-base font-semibold">
          {t("client.overview.money")}
        </h2>
        {project.agreedAmount === 0 ? (
          <p className="text-sm text-muted">{t("client.money.notAgreedYet")}</p>
        ) : (
          <BalanceSummary totals={project} />
        )}
        <TextLink to="../payments" relative="path" className="text-sm">
          {t("client.overview.seePayments")}
        </TextLink>
      </section>

      <section aria-labelledby="team-heading" className="space-y-3">
        <h2 id="team-heading" className="text-base font-semibold">
          {t("client.overview.team")}
        </h2>
        <p className="text-sm">
          {t("client.overview.teamMember", { name: project.operator.name })}
        </p>
        {project.operator.phone && (
          <WhatsAppLink phone={project.operator.phone} name={project.operator.name} />
        )}
      </section>
    </div>
  );
}
