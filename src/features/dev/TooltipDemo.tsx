import { Link2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/Tooltip";
import { DemoSection } from "./DemoSection";
import { StateCell } from "./StateCell";

export function TooltipDemo() {
  const { t } = useTranslation();

  return (
    <DemoSection id="tooltip" title={t("dev.sections.tooltip")}>
      <StateCell label={t("dev.states.tryIt")} wide>
        <div className="flex items-center gap-4">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="icon" aria-label={t("dev.tooltip.copyLink")}>
                <Link2 className="size-4" aria-hidden="true" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t("dev.tooltip.copyLink")}</TooltipContent>
          </Tooltip>
          <p className="text-sm text-muted">{t("dev.tooltip.hint")}</p>
        </div>
      </StateCell>
    </DemoSection>
  );
}
