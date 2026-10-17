import { useTranslation } from "react-i18next";
import { StatusBadge } from "@/components/StatusBadge";
import { INVITATION_STATUSES, PAYMENT_STATUSES, PROJECT_STATUSES } from "@/lib/status";
import { DemoSection } from "./DemoSection";
import { StateCell } from "./StateCell";

export function StatusBadgeDemo() {
  const { t } = useTranslation();

  return (
    <DemoSection id="statusBadge" title={t("dev.sections.statusBadge")}>
      <StateCell label={t("dev.status.project")} wide>
        <div className="flex flex-wrap gap-2">
          {PROJECT_STATUSES.map((status) => (
            <StatusBadge key={status} kind="project" status={status} />
          ))}
        </div>
      </StateCell>
      <StateCell label={t("dev.status.payment")}>
        <div className="flex flex-wrap gap-2">
          {PAYMENT_STATUSES.map((status) => (
            <StatusBadge key={status} kind="payment" status={status} />
          ))}
        </div>
      </StateCell>
      <StateCell label={t("dev.status.invitation")}>
        <div className="flex flex-wrap gap-2">
          {INVITATION_STATUSES.map((status) => (
            <StatusBadge key={status} kind="invitation" status={status} />
          ))}
        </div>
      </StateCell>
    </DemoSection>
  );
}
