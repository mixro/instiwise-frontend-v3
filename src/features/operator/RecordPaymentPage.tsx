import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Info } from "lucide-react";
import { useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
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
import { Textarea } from "@/components/ui/Textarea";
import type { PaymentMethod } from "@/features/client/api";
import { useErrorText } from "@/hooks/useErrorText";
import { useLanguage } from "@/hooks/useLanguage";
import { ApiError } from "@/lib/api";
import { paymentDateRange } from "@/lib/dates";
import { formatDate, formatTzs, parseTzs } from "@/lib/format";
import { operatorApi, type PaymentDraft, type PaymentPreview } from "./api";
import {
  METHODS_NEEDING_REFERENCE,
  PAYMENT_METHODS,
  paymentSchema,
  type PaymentValues,
} from "./paymentSchema";
import { useOperatorClient, useOperatorClients, useRefreshOperator } from "./queries";

function toDraft(values: PaymentValues): PaymentDraft {
  return {
    projectId: values.projectId,
    amount: parseTzs(values.amount),
    method: values.method as PaymentMethod,
    reference: values.reference?.trim() || undefined,
    receivedOn: values.receivedOn,
    note: values.note?.trim() || undefined,
  };
}

/**
 * Record money already received outside the platform (brief 12): details, then a
 * confirmation showing what the server says the balance becomes, then the receipt.
 */
export function RecordPaymentPage() {
  const { t } = useTranslation();
  const language = useLanguage();
  const { fieldError, apiError } = useErrorText();
  const navigate = useNavigate();
  const refresh = useRefreshOperator();
  const [params] = useSearchParams();
  const range = paymentDateRange();
  const [step, setStep] = useState<"details" | "confirm">("details");
  const [preview, setPreview] = useState<PaymentPreview>();
  const [formError, setFormError] = useState<string>();
  const [saving, setSaving] = useState(false);

  const {
    control,
    register,
    handleSubmit,
    setError,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<PaymentValues>({
    resolver: zodResolver(paymentSchema),
    mode: "onSubmit",
    reValidateMode: "onChange",
    defaultValues: {
      clientId: params.get("client") ?? "",
      projectId: "",
      amount: "",
      method: "",
      reference: "",
      receivedOn: range.max,
      note: "",
    },
  });

  const [clientId, method] = useWatch({ control, name: ["clientId", "method"] });
  const clients = useOperatorClients();
  const client = useOperatorClient(clientId, clientId !== "");
  const referenceRequired = METHODS_NEEDING_REFERENCE.includes(method as PaymentMethod);

  /** Server validation errors go on their field; anything else above the form. */
  function showError(error: unknown) {
    if (error instanceof ApiError && error.code === "PAYMENT_REFERENCE_REQUIRED") {
      setError("reference", { message: "validation.referenceRequired" }, { shouldFocus: true });
    } else if (error instanceof ApiError && error.code === "PAYMENT_DATE_OUT_OF_RANGE") {
      setError("receivedOn", { message: "validation.dateTooOld" }, { shouldFocus: true });
    } else {
      setFormError(apiError(error));
    }
  }

  async function review(values: PaymentValues) {
    setFormError(undefined);
    try {
      setPreview(await operatorApi.previewPayment(toDraft(values)));
      setStep("confirm");
    } catch (error) {
      showError(error);
    }
  }

  async function record() {
    setFormError(undefined);
    setSaving(true);
    try {
      const payment = await operatorApi.recordPayment(toDraft(getValues()));
      void refresh();
      navigate(`/operator/payments/receipts/${payment.receiptNumber}`, {
        state: { justRecorded: true },
      });
    } catch (error) {
      setSaving(false);
      setStep("details");
      showError(error);
    }
  }

  const values = getValues();

  return (
    <div className="space-y-6">
      <Link
        to="/operator/payments"
        className="-ml-1 inline-flex min-h-11 items-center gap-1 rounded-md px-1 text-sm text-muted hover:text-foreground sm:min-h-0"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        {t("nav.operator.payments")}
      </Link>
      <PageHeader title={t("operator.record.title")} description={t("operator.record.subtitle")} />
      <p className="text-sm font-medium text-muted" aria-live="polite">
        {step === "details" ? t("operator.record.step1") : t("operator.record.step2")}
      </p>
      {formError && <FormAlert>{formError}</FormAlert>}

      {step === "details" && (
        <form noValidate onSubmit={handleSubmit(review)} className="max-w-xl space-y-4">
          <FormField
            label={t("operator.payments.client")}
            error={fieldError(errors.clientId?.message)}
          >
            {({ id, ...aria }) => (
              <Controller
                control={control}
                name="clientId"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={(next) => {
                      field.onChange(next);
                      setValue("projectId", "");
                    }}
                  >
                    <SelectTrigger id={id} {...aria}>
                      <SelectValue placeholder={t("operator.record.chooseClient")} />
                    </SelectTrigger>
                    <SelectContent>
                      {(clients.data ?? []).map((option) => (
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
            label={t("client.payments.project")}
            error={fieldError(errors.projectId?.message)}
          >
            {({ id, ...aria }) => (
              <Controller
                control={control}
                name="projectId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange} disabled={!clientId}>
                    <SelectTrigger id={id} {...aria}>
                      <SelectValue placeholder={t("operator.record.chooseProject")} />
                    </SelectTrigger>
                    <SelectContent>
                      {(client.data?.projects ?? []).map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.title} ({project.reference})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            )}
          </FormField>

          <FormField
            label={t("operator.record.amount")}
            hint={t("changes.operator.priceHint")}
            error={fieldError(errors.amount?.message)}
          >
            {(field) => <Input inputMode="numeric" {...field} {...register("amount")} />}
          </FormField>

          <FormField label={t("client.payments.method")} error={fieldError(errors.method?.message)}>
            {({ id, ...aria }) => (
              <Controller
                control={control}
                name="method"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id={id} {...aria}>
                      <SelectValue placeholder={t("operator.record.chooseMethod")} />
                    </SelectTrigger>
                    <SelectContent>
                      {PAYMENT_METHODS.map((option) => (
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
            label={t("operator.record.reference")}
            hint={
              referenceRequired
                ? t("operator.record.referenceHint")
                : t("operator.record.referenceOptional")
            }
            optional={!referenceRequired}
            error={fieldError(errors.reference?.message)}
          >
            {(field) => <Input autoComplete="off" {...field} {...register("reference")} />}
          </FormField>

          <FormField
            label={t("operator.record.date")}
            hint={t("operator.record.dateHint")}
            error={fieldError(errors.receivedOn?.message)}
          >
            {(field) => (
              <Input
                type="date"
                min={range.min}
                max={range.max}
                {...field}
                {...register("receivedOn")}
              />
            )}
          </FormField>

          <FormField
            label={t("operator.record.note")}
            optional
            error={fieldError(errors.note?.message)}
          >
            {(field) => <Textarea rows={2} {...field} {...register("note")} />}
          </FormField>

          <Button
            type="submit"
            variant="primary"
            loading={isSubmitting}
            className="w-full sm:w-auto"
          >
            {t("operator.record.review")}
          </Button>
        </form>
      )}

      {step === "confirm" && preview && (
        <section aria-labelledby="confirm-heading" className="max-w-xl space-y-4">
          <h2 id="confirm-heading" className="text-lg font-semibold">
            {t("operator.record.confirmTitle", {
              amount: formatTzs(parseTzs(values.amount), language),
            })}
          </h2>
          <dl className="divide-y divide-border rounded-lg border border-border bg-surface text-sm">
            {(
              [
                [t("operator.payments.client"), preview.clientName],
                [
                  t("client.payments.project"),
                  `${preview.projectTitle} (${preview.projectReference})`,
                ],
                [
                  t("client.payments.method"),
                  [t(`client.methods.${values.method as PaymentMethod}`), values.reference]
                    .filter(Boolean)
                    .join(" · "),
                ],
                [t("operator.record.date"), formatDate(values.receivedOn, language)],
                [t("operator.record.balanceBefore"), formatTzs(preview.balanceBefore, language)],
                [t("operator.record.balanceAfter"), formatTzs(preview.balanceAfter, language)],
              ] as [string, string][]
            ).map(([label, value]) => (
              <div key={label} className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:gap-4">
                <dt className="text-muted sm:w-44 sm:shrink-0">{label}</dt>
                <dd className="tabular font-medium break-words">{value}</dd>
              </div>
            ))}
          </dl>
          {preview.creditAfter > 0 && (
            <p className="flex items-start gap-2 rounded-lg bg-warning-bg px-4 py-3 text-sm text-warning-fg">
              <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              {t("operator.record.credit", { amount: formatTzs(preview.creditAfter, language) })}
            </p>
          )}
          <p className="text-sm text-muted">{t("operator.record.permanent")}</p>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button onClick={() => setStep("details")} disabled={saving}>
              {t("operator.record.edit")}
            </Button>
            <Button variant="primary" loading={saving} onClick={() => void record()}>
              {t("operator.record.confirm")}
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}
