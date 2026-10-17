import { useTranslation } from "react-i18next";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { DemoSection } from "./DemoSection";
import { StateCell } from "./StateCell";
import { preview } from "./states";

const TABS = ["overview", "agreement", "progress", "payments", "documents"] as const;
const STATES = ["active", "default", "hover", "focus", "disabled"] as const;

export function TabsDemo() {
  const { t } = useTranslation();

  return (
    <DemoSection id="tabs" title={t("dev.sections.tabs")}>
      <StateCell label={t("dev.states.tryIt")} wide>
        <Tabs defaultValue="overview">
          <TabsList>
            {TABS.map((tab) => (
              <TabsTrigger key={tab} value={tab} disabled={tab === "documents"}>
                {t(`dev.tabs.${tab}`)}
              </TabsTrigger>
            ))}
          </TabsList>
          {TABS.map((tab) => (
            <TabsContent key={tab} value={tab} className="text-sm text-muted">
              {tab === "overview"
                ? t("dev.tabs.overviewBody")
                : t("dev.tabs.body", { tab: t(`dev.tabs.${tab}`) })}
            </TabsContent>
          ))}
        </Tabs>
      </StateCell>

      <StateCell label={t("dev.tabs.statesHint")} wide>
        {/* Controlled with no onValueChange, so the states stay put. */}
        <Tabs value="active">
          <TabsList>
            {STATES.map((state) => (
              <TabsTrigger
                key={state}
                value={state}
                disabled={state === "disabled"}
                {...preview(state)}
              >
                {t(`dev.states.${state}`)}
              </TabsTrigger>
            ))}
          </TabsList>
          <TabsContent value="active" className="text-sm text-muted">
            {t("dev.tabs.statesHint")}
          </TabsContent>
        </Tabs>
      </StateCell>
    </DemoSection>
  );
}
