import { MessageSquare } from "lucide-react";
import { useTranslation } from "react-i18next";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/Button";
import { DemoSection } from "./DemoSection";
import { StateCell } from "./StateCell";

export function EmptyStateDemo() {
  const { t } = useTranslation();

  return (
    <DemoSection id="emptyState" title={t("dev.sections.emptyState")} className="lg:grid-cols-2">
      <StateCell label={t("dev.empty.withAction")}>
        <EmptyState
          title={t("dev.empty.title")}
          description={t("dev.empty.description")}
          action={<Button variant="primary">{t("dev.actions.recordPayment")}</Button>}
        />
      </StateCell>
      <StateCell label={t("dev.empty.withoutAction")}>
        <EmptyState icon={MessageSquare} title={t("dev.empty.messagesTitle")} />
      </StateCell>
    </DemoSection>
  );
}
