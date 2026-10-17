import { useTranslation } from "react-i18next";
import { Textarea } from "@/components/ui/Textarea";
import { DemoField } from "./DemoField";
import { DemoSection } from "./DemoSection";
import { StateCell } from "./StateCell";
import { FIELD_STATES } from "./states";

export function TextareaDemo() {
  const { t } = useTranslation();

  return (
    <DemoSection id="textarea" title={t("dev.sections.textarea")}>
      {FIELD_STATES.map((state) => (
        <StateCell key={state} label={t(`dev.states.${state}`)}>
          <DemoField
            label={t("dev.fields.notes")}
            error={t("dev.fields.notesError")}
            state={state}
            skeletonClassName="h-24"
          >
            {(control) => (
              <Textarea
                rows={3}
                placeholder={t("dev.fields.notesPlaceholder")}
                defaultValue={state === "disabled" ? t("dev.fields.notesPlaceholder") : undefined}
                {...control}
              />
            )}
          </DemoField>
        </StateCell>
      ))}
    </DemoSection>
  );
}
