import { useTranslation } from "react-i18next";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/Button";
import { DemoSection } from "./DemoSection";
import { StateCell } from "./StateCell";
import { SAMPLE_CLIENT, SAMPLE_OPERATOR } from "./sample-data";

// level={2}: this page already has its h1.
export function PageHeaderDemo() {
  const { t } = useTranslation();

  return (
    <DemoSection id="pageHeader" title={t("dev.sections.pageHeader")}>
      <StateCell label={t("dev.header.titleOnly")} wide>
        <div className="rounded-lg border border-border bg-background p-6">
          <PageHeader level={2} title={t("dev.header.simpleTitle")} />
        </div>
      </StateCell>
      <StateCell label={t("dev.header.full")} wide>
        <div className="rounded-lg border border-border bg-background p-6">
          <PageHeader
            level={2}
            title={t("dev.header.title")}
            description={t("dev.header.description", {
              client: SAMPLE_CLIENT,
              operator: SAMPLE_OPERATOR,
            })}
            badge={<StatusBadge kind="project" status="ACTIVE" />}
            actions={
              <>
                <Button>{t("dev.header.messageClient")}</Button>
                <Button variant="primary">{t("dev.actions.recordPayment")}</Button>
              </>
            }
          />
        </div>
      </StateCell>
    </DemoSection>
  );
}
