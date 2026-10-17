import { useTranslation } from "react-i18next";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { DemoField } from "./DemoField";
import { DemoSection } from "./DemoSection";
import { StateCell } from "./StateCell";
import { PAYMENT_METHODS } from "./sample-data";
import { FIELD_STATES } from "./states";

export function SelectDemo() {
  const { t } = useTranslation();

  return (
    <DemoSection id="select" title={t("dev.sections.select")}>
      {FIELD_STATES.map((state) => (
        <StateCell key={state} label={t(`dev.states.${state}`)}>
          <DemoField
            label={t("dev.fields.method")}
            error={t("dev.fields.methodError")}
            state={state}
          >
            {({ disabled, ...control }) => (
              <Select disabled={disabled} defaultValue={disabled ? "mobile" : undefined}>
                <SelectTrigger {...control}>
                  <SelectValue placeholder={t("dev.fields.methodPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((method) => (
                    <SelectItem key={method} value={method}>
                      {t(`dev.methods.${method}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </DemoField>
        </StateCell>
      ))}
    </DemoSection>
  );
}
