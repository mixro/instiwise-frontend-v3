import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Info } from "lucide-react";
import { useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { FormAlert } from "@/components/FormAlert";
import { FormField } from "@/components/FormField";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { useErrorText } from "@/hooks/useErrorText";
import { useLanguage } from "@/hooks/useLanguage";
import { useToast } from "@/hooks/useToast";
import { ApiError } from "@/lib/api";
import { localDate } from "@/lib/dates";
import { formatDate, formatTzs, parseTzs } from "@/lib/format";
import { expensesApi } from "./api";
import {
  EXPENSES_HOME,
  useExpenseCategories,
  useExpenseProjects,
  useRefreshExpenses,
  type ExpenseRole,
} from "./queries";
import {
  EXPENSE_KINDS,
  EXPENSE_METHODS,
  emptyExpense,
  expenseSchema,
  toExpenseDraft,
  type ExpenseValues,
} from "./schema";

/**
 * Add an expense: details, then a check of everything before it is sent.
 * Operators' expenses wait for an admin; an admin's are approved at once.
 */
export function ExpenseFormPage({ role }: { role: ExpenseRole }) {
  const { t } = useTranslation();
  const language = useLanguage();
  const { fieldError, apiError } = useErrorText();
  const { toast } = useToast();
  const navigate = useNavigate();
  const refresh = useRefreshExpenses();
  const categories = useExpenseCategories(role);
  const projects = useExpenseProjects(role);
  const [step, setStep] = useState<"details" | "confirm">("details");
  const [formError, setFormError] = useState<string>();
  const [saving, setSaving] = useState(false);
  const home = EXPENSES_HOME[role];

  const {
    control,
    register,
    handleSubmit,
    setError,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<ExpenseValues>({
    resolver: zodResolver(expenseSchema),
    mode: "onSubmit",
    reValidateMode: "onChange",
    defaultValues: emptyExpense(),
  });
  const kind = useWatch({ control, name: "kind" });
  const activeCategories = (categories.data ?? []).filter(
    (category) => !("active" in category) || category.active,
  );

  /** Server errors go on their field; anything else above the form. */
  function showError(error: unknown) {
    const code = error instanceof ApiError ? error.code : undefined;
    if (code === "PROJECT_NOT_FOUND" || code === "EXPENSE_PROJECT_REQUIRED") {
      setError("projectId", { message: `apiErrors.${code}` }, { shouldFocus: true });
    } else if (code === "CATEGORY_INACTIVE" || code === "CATEGORY_NOT_FOUND") {
      setError("categoryId", { message: `apiErrors.${code}` }, { shouldFocus: true });
    } else {
      setFormError(apiError(error));
    }
  }

  async function submit() {
    setFormError(undefined);
    setSaving(true);
    try {
      const draft = toExpenseDraft(getValues());
      const saved =
        role === "ADMIN"
          ? await expensesApi.admin.create(draft)
          : await expensesApi.operator.submit(draft);
      toast({
        variant: "success",
        title:
          role === "ADMIN"
            ? t("expenses.form.added", { reference: saved.reference })
            : t("expenses.form.submitted", { reference: saved.reference }),
      });
      await refresh();
      navigate(home);
    } catch (error) {
      setSaving(false);
      setStep("details");
      showError(error);
    }
  }

  const values = getValues();
  const categoryName = activeCategories.find((c) => c.id === values.categoryId)?.name;
  const project = (projects.data ?? []).find((p) => p.id === values.projectId);
  const note = role === "ADMIN" ? t("expenses.form.noteAdmin") : t("expenses.form.noteOperator");

  return (
    <div className="space-y-6">
      <Link
        to={home}
        className="-ml-1 inline-flex min-h-11 items-center gap-1 rounded-md px-1 text-sm text-muted hover:text-foreground sm:min-h-0"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        {t("expenses.form.back")}
      </Link>
      <PageHeader title={t("expenses.form.title")} description={note} />
      <p className="text-sm font-medium text-muted" aria-live="polite">
        {step === "details" ? t("expenses.form.step1") : t("expenses.form.step2")}
      </p>
      {formError && <FormAlert>{formError}</FormAlert>}

      {step === "details" && (
        <form
          noValidate
          onSubmit={handleSubmit(() => {
            setFormError(undefined);
            setStep("confirm");
          })}
          className="max-w-xl space-y-4"
        >
          <FormField
            label={t("expenses.form.paidOn")}
            hint={t("expenses.form.paidOnHint")}
            error={fieldError(errors.paidOn?.message)}
          >
            {(field) => <Input type="date" max={localDate()} {...field} {...register("paidOn")} />}
          </FormField>

          <FormField
            label={t("expenses.form.amount")}
            hint={t("changes.operator.priceHint")}
            error={fieldError(errors.amount?.message)}
          >
            {(field) => <Input inputMode="numeric" {...field} {...register("amount")} />}
          </FormField>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">{t("expenses.form.kind")}</legend>
            <Controller
              control={control}
              name="kind"
              render={({ field }) => (
                <div className="grid gap-2 sm:grid-cols-2">
                  {EXPENSE_KINDS.map((option) => (
                    <label
                      key={option}
                      className="flex cursor-pointer gap-3 rounded-lg border border-input p-3 text-sm has-[:checked]:border-brand-text has-[:checked]:bg-brand-soft"
                    >
                      <input
                        type="radio"
                        name={field.name}
                        value={option}
                        checked={field.value === option}
                        onChange={() => {
                          field.onChange(option);
                          if (option === "FIXED") setValue("projectId", "");
                        }}
                        className="mt-0.5 accent-[var(--brand)]"
                      />
                      <span>
                        <span className="block font-medium">{t(`expenses.kind.${option}`)}</span>
                        <span className="block text-muted">{t(`expenses.kindHint.${option}`)}</span>
                      </span>
                    </label>
                  ))}
                </div>
              )}
            />
          </fieldset>

          {kind === "VARIABLE" && (
            <FormField
              label={t("expenses.form.project")}
              hint={role === "OPERATOR" ? t("expenses.form.projectHintOperator") : undefined}
              error={fieldError(errors.projectId?.message)}
            >
              {({ id, ...aria }) => (
                <Controller
                  control={control}
                  name="projectId"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id={id} {...aria}>
                        <SelectValue placeholder={t("expenses.form.chooseProject")} />
                      </SelectTrigger>
                      <SelectContent>
                        {(projects.data ?? []).map((option) => (
                          <SelectItem key={option.id} value={option.id}>
                            {option.title} ({option.clientName})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              )}
            </FormField>
          )}

          <FormField
            label={t("expenses.form.category")}
            error={fieldError(errors.categoryId?.message)}
          >
            {({ id, ...aria }) => (
              <Controller
                control={control}
                name="categoryId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id={id} {...aria}>
                      <SelectValue placeholder={t("expenses.form.chooseCategory")} />
                    </SelectTrigger>
                    <SelectContent>
                      {activeCategories.map((option) => (
                        <SelectItem key={option.id} value={option.id}>
                          {option.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            )}
          </FormField>

          <FormField
            label={t("expenses.form.description")}
            error={fieldError(errors.description?.message)}
          >
            {(field) => <Input {...field} {...register("description")} />}
          </FormField>

          <FormField
            label={t("expenses.form.vendor")}
            hint={t("expenses.form.vendorHint")}
            optional
            error={fieldError(errors.vendor?.message)}
          >
            {(field) => <Input {...field} {...register("vendor")} />}
          </FormField>

          <FormField
            label={t("expenses.form.method")}
            error={fieldError(errors.paymentMethod?.message)}
          >
            {({ id, ...aria }) => (
              <Controller
                control={control}
                name="paymentMethod"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id={id} {...aria}>
                      <SelectValue placeholder={t("expenses.form.chooseMethod")} />
                    </SelectTrigger>
                    <SelectContent>
                      {EXPENSE_METHODS.map((option) => (
                        <SelectItem key={option} value={option}>
                          {t(`client.methods.${option}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            )}
          </FormField>

          <FormField
            label={t("expenses.form.reference")}
            optional
            error={fieldError(errors.referenceNumber?.message)}
          >
            {(field) => <Input autoComplete="off" {...field} {...register("referenceNumber")} />}
          </FormField>

          <p className="flex items-start gap-2 rounded-lg bg-surface-muted px-4 py-3 text-sm">
            <Info className="mt-0.5 size-4 shrink-0 text-brand-text" aria-hidden="true" />
            {note}
          </p>

          <Button
            type="submit"
            variant="primary"
            loading={isSubmitting}
            className="w-full sm:w-auto"
          >
            {t("expenses.form.review")}
          </Button>
        </form>
      )}

      {step === "confirm" && (
        <section aria-labelledby="expense-confirm" className="max-w-xl space-y-4">
          <h2 id="expense-confirm" className="text-lg font-semibold">
            {t("expenses.form.confirmTitle", {
              amount: formatTzs(parseTzs(values.amount), language),
            })}
          </h2>
          <dl className="divide-y divide-border rounded-lg border border-border bg-surface text-sm">
            {(
              [
                [t("expenses.form.paidOn"), formatDate(values.paidOn, language)],
                [t("expenses.form.kind"), t(`expenses.kind.${values.kind}`)],
                [
                  t("expenses.form.project"),
                  values.kind === "VARIABLE" && project
                    ? `${project.title} (${project.reference})`
                    : t("expenses.companyCost"),
                ],
                [t("expenses.form.category"), categoryName ?? "—"],
                [t("expenses.form.description"), values.description.trim()],
                [t("expenses.form.vendor"), values.vendor.trim() || "—"],
                [
                  t("expenses.form.method"),
                  [
                    t(`client.methods.${values.paymentMethod as (typeof EXPENSE_METHODS)[number]}`),
                    values.referenceNumber.trim(),
                  ]
                    .filter(Boolean)
                    .join(" · "),
                ],
              ] as [string, string][]
            ).map(([label, value]) => (
              <div key={label} className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:gap-4">
                <dt className="text-muted sm:w-44 sm:shrink-0">{label}</dt>
                <dd className="font-medium break-words">{value}</dd>
              </div>
            ))}
          </dl>
          <p className="flex items-start gap-2 rounded-lg bg-warning-bg px-4 py-3 text-sm text-warning-fg">
            <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            {note}
          </p>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button onClick={() => setStep("details")} disabled={saving}>
              {t("expenses.form.edit")}
            </Button>
            <Button variant="primary" loading={saving} onClick={() => void submit()}>
              {role === "ADMIN"
                ? t("expenses.form.submitAdmin")
                : t("expenses.form.submitOperator")}
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}
