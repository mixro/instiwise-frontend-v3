import { zodResolver } from "@hookform/resolvers/zod";
import { ShieldCheck } from "lucide-react";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { FormAlert } from "@/components/FormAlert";
import { FormField } from "@/components/FormField";
import { TermsEditor } from "@/components/TermsEditor";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { changesApi, type ChangeTerms } from "@/features/changes/api";
import { useRefreshAfterDecision } from "@/features/changes/queries";
import { useErrorText } from "@/hooks/useErrorText";
import { useToast } from "@/hooks/useToast";
import { parseTzs } from "@/lib/format";
import { cleanTerms, termsField } from "@/lib/terms";

const schema = z.object({
  title: z.string().trim().min(3, "validation.changeTitleRequired").max(120, "validation.tooLong"),
  reason: z
    .string()
    .trim()
    .min(10, "validation.changeReasonRequired")
    .max(1000, "validation.tooLong"),
  // Each item in English and Swahili (ADR 0004).
  scope: termsField({ required: "validation.scopeRequired" }),
  price: z.string().refine((value) => !Number.isNaN(parseTzs(value)), "validation.amountInvalid"),
  deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "validation.dateInvalid"),
});

type Values = z.infer<typeof schema>;

interface ProposeChangeFormProps {
  projectId: string;
  current: ChangeTerms;
  onDone: () => void;
}

/**
 * The operator's proposal, starting from the accepted agreement. Changing the price
 * or the deadline sends it to an admin first; the server decides and says so.
 */
export function ProposeChangeForm({ projectId, current, onDone }: ProposeChangeFormProps) {
  const { t } = useTranslation();
  const { fieldError, apiError } = useErrorText();
  const { toast } = useToast();
  const refresh = useRefreshAfterDecision();
  const [formError, setFormError] = useState<string>();

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    mode: "onSubmit",
    reValidateMode: "onChange",
    defaultValues: {
      title: "",
      reason: "",
      scope: current.scope.map((item) => ({ ...item })),
      price: String(current.price),
      deadline: current.deadline,
    },
  });
  const [price, deadline] = useWatch({ control, name: ["price", "deadline"] });
  const needsAdmin = parseTzs(price) !== current.price || deadline !== current.deadline;

  async function onSubmit(values: Values) {
    setFormError(undefined);
    try {
      const created = await changesApi.operator.propose(projectId, {
        title: values.title,
        reason: values.reason,
        scope: cleanTerms(values.scope),
        price: parseTzs(values.price),
        deadline: values.deadline,
      });
      toast({
        variant: "success",
        title:
          created.status === "UNDER_REVIEW"
            ? t("changes.operator.sentToAdmin", { number: created.number })
            : t("changes.operator.sentToClient", { number: created.number }),
      });
      void refresh();
      onDone();
    } catch (error) {
      setFormError(apiError(error));
    }
  }

  return (
    <form noValidate onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {formError && <FormAlert>{formError}</FormAlert>}
      <FormField label={t("changes.operator.title")} error={fieldError(errors.title?.message)}>
        {(field) => <Input {...field} {...register("title")} />}
      </FormField>
      <FormField
        label={t("changes.operator.reason")}
        hint={t("changes.operator.reasonHint")}
        error={fieldError(errors.reason?.message)}
      >
        {(field) => <Textarea rows={3} {...field} {...register("reason")} />}
      </FormField>

      <TermsEditor
        control={control}
        name="scope"
        legend={t("changes.scope")}
        hint={t("changes.operator.scopeHint")}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          label={t("changes.operator.price")}
          hint={t("changes.operator.priceHint")}
          error={fieldError(errors.price?.message)}
        >
          {(field) => <Input inputMode="numeric" {...field} {...register("price")} />}
        </FormField>
        <FormField label={t("changes.deadline")} error={fieldError(errors.deadline?.message)}>
          {(field) => <Input type="date" {...field} {...register("deadline")} />}
        </FormField>
      </div>

      <p
        className="flex items-start gap-2 rounded-lg bg-surface-muted px-4 py-3 text-sm"
        aria-live="polite"
      >
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden="true" />
        {needsAdmin ? t("changes.operator.needsAdmin") : t("changes.operator.goesToClient")}
      </p>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button onClick={onDone}>{t("ui.cancel")}</Button>
        <Button type="submit" variant="primary" loading={isSubmitting}>
          {t("changes.operator.submit")}
        </Button>
      </div>
    </form>
  );
}
