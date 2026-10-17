import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { FormAlert } from "@/components/FormAlert";
import { FormField } from "@/components/FormField";
import { Button } from "@/components/ui/Button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import type { StaffPayment } from "@/features/operator/api";
import { useErrorText } from "@/hooks/useErrorText";
import { useLanguage } from "@/hooks/useLanguage";
import { useToast } from "@/hooks/useToast";
import { formatTzs, parseTzs } from "@/lib/format";
import { adminApi } from "./api";
import { useRefreshAll } from "./queries";

const schema = z.object({
  direction: z.enum(["decrease", "increase"]),
  amount: z.string().refine((value) => parseTzs(value) > 0, "validation.amountPositive"),
  reason: z.string().trim().min(10, "validation.correctionReason").max(500, "validation.tooLong"),
});
type Values = z.infer<typeof schema>;

interface AdjustDialogProps {
  payment: StaffPayment;
  onClose: () => void;
}

/**
 * A partial correction: a new COR row of plus or minus the difference, linked to
 * the payment, which keeps its number and is marked Adjusted.
 */
export function AdjustDialog({ payment, onClose }: AdjustDialogProps) {
  const { t } = useTranslation();
  const language = useLanguage();
  const { fieldError, apiError } = useErrorText();
  const { toast } = useToast();
  const refresh = useRefreshAll();
  const [formError, setFormError] = useState<string>();

  const {
    control,
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    mode: "onSubmit",
    reValidateMode: "onChange",
    defaultValues: { direction: "decrease", amount: "", reason: "" },
  });

  async function onSubmit(values: Values) {
    setFormError(undefined);
    const amount = parseTzs(values.amount) * (values.direction === "decrease" ? -1 : 1);
    try {
      const row = await adminApi.adjust(payment.id, amount, values.reason);
      toast({
        variant: "success",
        title: t("finance.adjustDone", {
          number: payment.receiptNumber,
          correction: row.receiptNumber,
        }),
      });
      void refresh();
      onClose();
    } catch (error) {
      setFormError(apiError(error));
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && !isSubmitting && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("finance.adjustTitle", { number: payment.receiptNumber })}</DialogTitle>
          <DialogDescription>
            {t("finance.adjustBody", {
              number: payment.receiptNumber,
              amount: formatTzs(payment.amount, language),
            })}
          </DialogDescription>
        </DialogHeader>
        <form id="adjust-form" noValidate onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {formError && <FormAlert>{formError}</FormAlert>}
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">{t("finance.direction")}</legend>
            <Controller
              control={control}
              name="direction"
              render={({ field }) => (
                <div className="flex flex-col gap-2 sm:flex-row">
                  {(["decrease", "increase"] as const).map((direction) => (
                    <label
                      key={direction}
                      className="flex min-h-11 flex-1 cursor-pointer items-center gap-2 rounded-lg border border-input px-4 text-sm has-[:checked]:border-brand-text has-[:checked]:bg-brand-soft"
                    >
                      <input
                        type="radio"
                        name={field.name}
                        value={direction}
                        checked={field.value === direction}
                        onChange={() => field.onChange(direction)}
                        className="accent-[var(--brand)]"
                      />
                      {t(`finance.${direction}`)}
                    </label>
                  ))}
                </div>
              )}
            />
          </fieldset>
          <FormField
            label={t("finance.adjustAmount")}
            hint={t("changes.operator.priceHint")}
            error={fieldError(errors.amount?.message)}
          >
            {(field) => <Input inputMode="numeric" {...field} {...register("amount")} />}
          </FormField>
          <FormField
            label={t("finance.reasonLabel")}
            hint={t("changes.admin.reasonHint")}
            error={fieldError(errors.reason?.message)}
          >
            {(field) => <Textarea rows={3} {...field} {...register("reason")} />}
          </FormField>
        </form>
        <DialogFooter>
          <DialogClose asChild>
            <Button disabled={isSubmitting}>{t("ui.cancel")}</Button>
          </DialogClose>
          <Button type="submit" form="adjust-form" variant="primary" loading={isSubmitting}>
            {t("finance.adjust")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
