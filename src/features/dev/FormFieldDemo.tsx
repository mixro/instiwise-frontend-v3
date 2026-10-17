import { useTranslation } from "react-i18next";
import { FormField } from "@/components/FormField";
import { Input } from "@/components/ui/Input";
import { DemoSection } from "./DemoSection";
import { StateCell } from "./StateCell";

export function FormFieldDemo() {
  const { t } = useTranslation();

  return (
    <DemoSection id="formField" title={t("dev.sections.formField")}>
      <StateCell label={t("dev.states.default")}>
        <FormField label={t("dev.formField.phone")}>
          {(control) => <Input type="tel" autoComplete="tel" {...control} />}
        </FormField>
      </StateCell>
      <StateCell label={t("dev.formField.withHint")}>
        <FormField label={t("dev.formField.phone")} hint={t("dev.formField.phoneHint")}>
          {(control) => <Input type="tel" autoComplete="tel" {...control} />}
        </FormField>
      </StateCell>
      <StateCell label={t("dev.formField.optional")}>
        <FormField label={t("dev.formField.reference")} optional>
          {(control) => <Input {...control} />}
        </FormField>
      </StateCell>
      <StateCell label={t("dev.states.error")}>
        <FormField
          label={t("dev.formField.phone")}
          hint={t("dev.formField.phoneHint")}
          error={t("dev.formField.phoneError")}
        >
          {(control) => <Input type="tel" defaultValue="0754 321 98" {...control} />}
        </FormField>
      </StateCell>
      <StateCell label={t("dev.states.disabled")}>
        <FormField label={t("dev.formField.phone")}>
          {(control) => <Input type="tel" defaultValue="+255 754 321 987" disabled {...control} />}
        </FormField>
      </StateCell>
    </DemoSection>
  );
}
