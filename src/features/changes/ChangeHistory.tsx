import { useTranslation } from "react-i18next";
import { StatusBadge } from "@/components/StatusBadge";
import { useLanguage } from "@/hooks/useLanguage";
import { formatDate } from "@/lib/format";
import type { ChangeRequest } from "./api";
import { ChangePreview } from "./ChangePreview";

/** Who decided what, and when, in words. */
export function DecisionLine({ change }: { change: ChangeRequest }) {
  const { t } = useTranslation();
  const language = useLanguage();
  const { adminReview, clientDecision } = change;

  if (clientDecision) {
    const date = formatDate(clientDecision.at, language);
    return clientDecision.outcome === "ACCEPTED" ? (
      <p className="text-sm text-muted">
        {t("changes.history.accepted", { name: clientDecision.by, date })}
        {change.agreementVersion !== undefined &&
          ` ${t("changes.history.becameVersion", { version: change.agreementVersion })}`}
      </p>
    ) : (
      <p className="text-sm text-muted">
        {t("changes.history.rejected", { name: clientDecision.by, date })}{" "}
        <q className="text-foreground">{clientDecision.reason}</q>
      </p>
    );
  }
  if (adminReview?.outcome === "REJECTED") {
    return (
      <p className="text-sm text-muted">
        {t("changes.history.adminRejected", {
          name: adminReview.by,
          date: formatDate(adminReview.at, language),
        })}{" "}
        <q className="text-foreground">{adminReview.reason}</q>
      </p>
    );
  }
  if (change.status === "UNDER_REVIEW") {
    return <p className="text-sm text-muted">{t("changes.history.waitingAdmin")}</p>;
  }
  return (
    <p className="text-sm text-muted">
      {adminReview
        ? t("changes.history.approved", {
            name: adminReview.by,
            date: formatDate(adminReview.at, language),
          })
        : t("changes.history.direct")}{" "}
      {t("changes.history.waitingClient")}
    </p>
  );
}

/** Every change request of a project, newest first; each opens to its before/after. */
export function ChangeHistory({ changes }: { changes: ChangeRequest[] }) {
  const { t } = useTranslation();
  const language = useLanguage();

  return (
    <ul className="space-y-2">
      {changes.map((change) => (
        <li key={change.id}>
          <details className="rounded-lg border border-border bg-surface px-4 py-3">
            <summary className="cursor-pointer list-none space-y-1">
              <span className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{change.title}</span>
                <StatusBadge kind="changeRequest" status={change.status} />
              </span>
              <span className="block text-xs text-muted">
                {t("changes.proposedBy", {
                  number: change.number,
                  name: change.createdBy,
                  date: formatDate(change.createdAt, language),
                })}
              </span>
              <DecisionLine change={change} />
              <span className="inline-flex min-h-11 items-center text-sm font-medium text-brand-text underline underline-offset-4 sm:min-h-0">
                {t("changes.showDetails")}
              </span>
            </summary>
            <div className="pt-4">
              <ChangePreview change={change} />
            </div>
          </details>
        </li>
      ))}
    </ul>
  );
}
