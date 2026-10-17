import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
import { DemoSection } from "./DemoSection";
import { StateCell } from "./StateCell";
import { preview } from "./states";

const VARIANTS = [
  { variant: "primary", label: "dev.actions.recordPayment" },
  { variant: "secondary", label: "dev.actions.viewReceipt" },
  { variant: "ghost", label: "dev.actions.cancel" },
] as const;

const STATES = ["default", "hover", "focus", "disabled", "loading"] as const;

export function ButtonDemo() {
  const { t } = useTranslation();

  return (
    <DemoSection id="button" title={t("dev.sections.button")} className="lg:grid-cols-5">
      {VARIANTS.flatMap(({ variant, label }) =>
        STATES.map((state) => (
          <StateCell
            key={`${variant}-${state}`}
            label={`${t(`dev.variants.${variant}`)} · ${t(`dev.states.${state}`)}`}
          >
            <Button
              variant={variant}
              disabled={state === "disabled"}
              loading={state === "loading"}
              className="self-start"
              {...preview(state)}
            >
              {state === "loading" ? t("dev.actions.saving") : t(label)}
            </Button>
          </StateCell>
        )),
      )}
    </DemoSection>
  );
}
