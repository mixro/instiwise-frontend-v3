import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/hooks/useToast";
import { DemoSection } from "./DemoSection";
import { StateCell } from "./StateCell";
import { SAMPLE_RECEIPT } from "./sample-data";

export function ToastDemo() {
  const { t } = useTranslation();
  const { toast } = useToast();

  return (
    <DemoSection id="toast" title={t("dev.sections.toast")}>
      <StateCell label={t("dev.states.tryIt")} wide>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() =>
              toast({ title: t("dev.toast.infoTitle"), description: t("dev.toast.infoBody") })
            }
          >
            {t("dev.toast.showInfo")}
          </Button>
          <Button
            onClick={() =>
              toast({
                variant: "success",
                title: t("dev.toast.successTitle"),
                description: t("dev.toast.successBody", { number: SAMPLE_RECEIPT }),
              })
            }
          >
            {t("dev.toast.showSuccess")}
          </Button>
          <Button
            onClick={() =>
              toast({
                variant: "error",
                title: t("dev.toast.errorTitle"),
                description: t("dev.toast.errorBody"),
              })
            }
          >
            {t("dev.toast.showError")}
          </Button>
        </div>
      </StateCell>
    </DemoSection>
  );
}
