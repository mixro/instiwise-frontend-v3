import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/Input";
import { DemoField } from "./DemoField";
import { DemoSection } from "./DemoSection";
import { StateCell } from "./StateCell";
import { FIELD_STATES } from "./states";

export function InputDemo() {
  const { t } = useTranslation();

  return (
    <DemoSection id="input" title={t("dev.sections.input")}>
      {FIELD_STATES.map((state) => (
        <StateCell key={state} label={t(`dev.states.${state}`)}>
          <DemoField
            label={t("dev.fields.amount")}
            error={t("dev.fields.amountError")}
            state={state}
          >
            {(control) => (
              <Input
                inputMode="numeric"
                placeholder={t("dev.fields.amountPlaceholder")}
                defaultValue={
                  state === "error" ? "45000.50" : state === "disabled" ? "450000" : undefined
                }
                {...control}
              />
            )}
          </DemoField>
        </StateCell>
      ))}
    </DemoSection>
  );
}
