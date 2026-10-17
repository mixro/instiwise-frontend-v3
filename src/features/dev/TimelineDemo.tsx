import { ListChecks } from "lucide-react";
import { useTranslation } from "react-i18next";
import { EmptyState } from "@/components/EmptyState";
import { Timeline, type TimelineItem } from "@/components/Timeline";
import { DemoSection } from "./DemoSection";
import { StateCell } from "./StateCell";
import { SAMPLE_CLIENT, SAMPLE_OPERATOR } from "./sample-data";

export function TimelineDemo() {
  const { t } = useTranslation();

  const items: TimelineItem[] = [
    {
      id: "agreement",
      title: t("dev.timeline.agreementAccepted"),
      date: "2026-10-14",
      meta: `${SAMPLE_CLIENT} · ${t("dev.timeline.clientVisible")}`,
    },
    {
      id: "sensors",
      title: t("dev.timeline.sensorsTested"),
      date: "2026-10-09",
      meta: `${SAMPLE_OPERATOR} · ${t("dev.timeline.internal")}`,
      description: t("dev.timeline.sensorsBody"),
    },
    {
      id: "enclosure",
      title: t("dev.timeline.enclosurePrinted"),
      date: "2026-09-30",
      meta: `${SAMPLE_OPERATOR} · ${t("dev.timeline.clientVisible")}`,
    },
  ];

  const empty = (
    <EmptyState
      icon={ListChecks}
      title={t("dev.timeline.empty")}
      description={t("dev.timeline.emptyBody")}
    />
  );

  return (
    <DemoSection id="timeline" title={t("dev.sections.timeline")}>
      <StateCell label={t("dev.timeline.withItems")}>
        <Timeline items={items} />
      </StateCell>
      <StateCell label={t("dev.states.loading")}>
        <Timeline items={[]} loading />
      </StateCell>
      <StateCell label={t("dev.states.empty")}>
        <Timeline items={[]} empty={empty} />
      </StateCell>
    </DemoSection>
  );
}
