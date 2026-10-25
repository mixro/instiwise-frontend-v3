import { Plus, Trash2 } from "lucide-react";
import { useFieldArray, type UseFormReturn } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { FormField } from "@/components/FormField";
import { TermsEditor } from "@/components/TermsEditor";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { useErrorText } from "@/hooks/useErrorText";
import type { ProjectFormValues } from "./schemas";

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4 rounded-lg border border-border bg-surface p-4 sm:p-6">
      <h2 className="text-base font-semibold">{title}</h2>
      {children}
    </section>
  );
}

/**
 * The project's fields and its agreement v1 terms, shared by "New project" and the
 * draft page. Amounts are whole shillings; every term in English and Swahili.
 */
export function ProjectFormFields({ form }: { form: UseFormReturn<ProjectFormValues> }) {
  const { t } = useTranslation();
  const { fieldError } = useErrorText();
  const {
    register,
    control,
    formState: { errors },
  } = form;
  const deliverables = useFieldArray({ control, name: "deliverables" });

  return (
    <>
      <Group title={t("projects.form.projectGroup")}>
        <FormField label={t("projects.form.title")} error={fieldError(errors.title?.message)}>
          {(field) => <Input {...field} {...register("title")} />}
        </FormField>
        <FormField
          label={t("projects.form.category")}
          hint={t("projects.form.categoryHint")}
          error={fieldError(errors.category?.message)}
        >
          {(field) => <Input {...field} {...register("category")} />}
        </FormField>
        <FormField
          label={t("projects.form.description")}
          hint={t("projects.form.descriptionHint")}
          error={fieldError(errors.description?.message)}
          optional
        >
          {(field) => <Textarea rows={3} {...field} {...register("description")} />}
        </FormField>

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">{t("projects.form.deliverables")}</legend>
          <p className="text-sm text-muted">{t("projects.form.deliverablesHint")}</p>
          <ol className="space-y-2">
            {deliverables.fields.map((row, index) => (
              <li key={row.id} className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <Input
                    aria-label={t("projects.form.deliverable", { number: index + 1 })}
                    aria-invalid={errors.deliverables?.[index]?.item ? true : undefined}
                    {...register(`deliverables.${index}.item`)}
                  />
                  {errors.deliverables?.[index]?.item && (
                    <p className="mt-1 text-sm text-danger-fg">
                      {fieldError(errors.deliverables[index]?.item?.message)}
                    </p>
                  )}
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={t("projects.form.removeDeliverable", { number: index + 1 })}
                  onClick={() => deliverables.remove(index)}
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                </Button>
              </li>
            ))}
          </ol>
          <Button size="sm" onClick={() => deliverables.append({ item: "" })}>
            <Plus className="size-4" aria-hidden="true" />
            {t("projects.form.addDeliverable")}
          </Button>
        </fieldset>

        <FormField
          label={t("projects.form.startDate")}
          error={fieldError(errors.startDate?.message)}
          className="sm:max-w-xs"
        >
          {(field) => <Input type="date" {...field} {...register("startDate")} />}
        </FormField>
      </Group>

      <Group title={t("projects.form.agreementGroup")}>
        <p className="text-sm text-muted">{t("projects.form.agreementIntro")}</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            label={t("projects.form.price")}
            hint={t("projects.form.priceHint")}
            error={fieldError(errors.price?.message)}
          >
            {(field) => <Input inputMode="numeric" {...field} {...register("price")} />}
          </FormField>
          <FormField
            label={t("projects.form.deadline")}
            error={fieldError(errors.deadline?.message)}
          >
            {(field) => <Input type="date" {...field} {...register("deadline")} />}
          </FormField>
        </div>
        <TermsEditor
          control={control}
          name="scope"
          legend={t("client.agreement.scope")}
          hint={t("terms.hint")}
        />
        <TermsEditor
          control={control}
          name="exclusions"
          legend={t("client.agreement.exclusions")}
        />
        <TermsEditor
          control={control}
          name="paymentTerms"
          legend={t("client.agreement.paymentTerms")}
        />
      </Group>
    </>
  );
}
