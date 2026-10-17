import { useId } from "react";
import { useTranslation } from "react-i18next";
import { Checkbox } from "@/components/ui/Checkbox";
import { Label } from "@/components/ui/Label";
import { DemoSection } from "./DemoSection";
import { StateCell } from "./StateCell";
import { preview } from "./states";

const STATES = [
  "default",
  "hover",
  "focus",
  "checked",
  "disabled",
  "disabledChecked",
  "error",
] as const;

type CheckboxState = (typeof STATES)[number];

function ConfirmCheckbox({ state }: { state: CheckboxState }) {
  const { t } = useTranslation();
  const id = useId();
  const errorId = `${id}-error`;
  const isError = state === "error";

  return (
    <div className="flex flex-col gap-2">
      <div className="flex min-h-11 items-center gap-3">
        <Checkbox
          id={id}
          defaultChecked={state === "checked" || state === "disabledChecked"}
          disabled={state === "disabled" || state === "disabledChecked"}
          aria-invalid={isError || undefined}
          aria-describedby={isError ? errorId : undefined}
          {...preview(state)}
        />
        <Label htmlFor={id}>{t("dev.fields.confirm")}</Label>
      </div>
      {isError && (
        <p id={errorId} className="text-sm text-danger-fg">
          {t("dev.fields.confirmError")}
        </p>
      )}
    </div>
  );
}

export function CheckboxDemo() {
  const { t } = useTranslation();

  return (
    <DemoSection id="checkbox" title={t("dev.sections.checkbox")}>
      {STATES.map((state) => (
        <StateCell key={state} label={t(`dev.states.${state}`)}>
          <ConfirmCheckbox state={state} />
        </StateCell>
      ))}
    </DemoSection>
  );
}
