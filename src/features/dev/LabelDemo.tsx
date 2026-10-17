import { useId } from "react";
import { useTranslation } from "react-i18next";
import { Checkbox } from "@/components/ui/Checkbox";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { DemoSection } from "./DemoSection";
import { StateCell } from "./StateCell";

// A label has no hover, focus, error or loading look of its own; it follows its control.
export function LabelDemo() {
  const { t } = useTranslation();
  const inputId = useId();
  const checkboxId = useId();

  return (
    <DemoSection id="label" title={t("dev.sections.label")}>
      <StateCell label={t("dev.states.default")}>
        <div className="flex flex-col gap-2">
          <Label htmlFor={inputId}>{t("dev.fields.amount")}</Label>
          <Input id={inputId} inputMode="numeric" placeholder={t("dev.fields.amountPlaceholder")} />
        </div>
      </StateCell>
      <StateCell label={t("dev.states.disabled")}>
        <div className="flex min-h-11 items-center gap-3">
          <Checkbox id={checkboxId} disabled />
          <Label htmlFor={checkboxId}>{t("dev.fields.confirm")}</Label>
        </div>
        <p className="text-sm text-muted">{t("dev.fields.labelHint")}</p>
      </StateCell>
    </DemoSection>
  );
}
