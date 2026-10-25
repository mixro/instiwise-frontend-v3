import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { ErrorState } from "@/components/ErrorState";
import { FormAlert } from "@/components/FormAlert";
import { FormField } from "@/components/FormField";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";
import { Textarea } from "@/components/ui/Textarea";
import { ExpenseCategoriesSettings } from "@/features/expenses/ExpenseCategoriesSettings";
import { useErrorText } from "@/hooks/useErrorText";
import { useToast } from "@/hooks/useToast";
import { formatTzPhone, normalizeTzPhone } from "@/lib/phone";
import { adminApi, SETTINGS_LIMITS, type Settings } from "./api";
import { useAdminSettings, useRefreshAll } from "./queries";

const phone = z
  .string()
  .trim()
  .min(1, "validation.phoneRequired")
  .refine((value) => value === "" || normalizeTzPhone(value) !== null, "validation.phoneInvalid");

const schema = z.object({
  issuerName: z
    .string()
    .trim()
    .min(2, "validation.issuerNameRequired")
    .max(100, "validation.tooLong"),
  issuerPhone: phone,
  issuerAddress: z
    .string()
    .trim()
    .min(5, "validation.addressRequired")
    .max(200, "validation.tooLong"),
  whatsappNumber: phone,
  invitationValidityDays: z.string().refine((value) => {
    const days = Number(value);
    return (
      /^\d+$/.test(value) &&
      days >= SETTINGS_LIMITS.invitationDaysMin &&
      days <= SETTINGS_LIMITS.invitationDaysMax
    );
  }, "validation.invitationDays"),
});
type Values = z.infer<typeof schema>;

function toValues(settings: Settings): Values {
  return {
    issuerName: settings.issuerName,
    issuerPhone: formatTzPhone(settings.issuerPhone),
    issuerAddress: settings.issuerAddress,
    whatsappNumber: formatTzPhone(settings.whatsappNumber),
    invitationValidityDays: String(settings.invitationValidityDays),
  };
}

function SettingsForm({ settings }: { settings: Settings }) {
  const { t } = useTranslation();
  const { fieldError, apiError } = useErrorText();
  const { toast } = useToast();
  const refresh = useRefreshAll();
  const [formError, setFormError] = useState<string>();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    mode: "onSubmit",
    reValidateMode: "onChange",
    defaultValues: toValues(settings),
  });

  async function onSubmit(values: Values) {
    setFormError(undefined);
    try {
      const saved = await adminApi.saveSettings({
        issuerName: values.issuerName,
        issuerPhone: normalizeTzPhone(values.issuerPhone) ?? values.issuerPhone,
        issuerAddress: values.issuerAddress,
        whatsappNumber: normalizeTzPhone(values.whatsappNumber) ?? values.whatsappNumber,
        invitationValidityDays: Number(values.invitationValidityDays),
      });
      reset(toValues(saved));
      toast({ variant: "success", title: t("settings.saved") });
      void refresh();
    } catch (error) {
      setFormError(apiError(error));
    }
  }

  return (
    <form noValidate onSubmit={handleSubmit(onSubmit)} className="max-w-xl space-y-8">
      {formError && <FormAlert>{formError}</FormAlert>}
      <fieldset className="space-y-4">
        <legend className="text-base font-semibold">{t("settings.issuer")}</legend>
        <p className="text-sm text-muted">{t("settings.issuerHint")}</p>
        <FormField label={t("settings.issuerName")} error={fieldError(errors.issuerName?.message)}>
          {(field) => <Input {...field} {...register("issuerName")} />}
        </FormField>
        <FormField
          label={t("settings.issuerPhone")}
          error={fieldError(errors.issuerPhone?.message)}
        >
          {(field) => <Input type="tel" {...field} {...register("issuerPhone")} />}
        </FormField>
        <FormField
          label={t("settings.issuerAddress")}
          error={fieldError(errors.issuerAddress?.message)}
        >
          {(field) => <Textarea rows={2} {...field} {...register("issuerAddress")} />}
        </FormField>
      </fieldset>
      <fieldset className="space-y-4">
        <legend className="text-base font-semibold">{t("settings.contact")}</legend>
        <FormField
          label={t("settings.whatsapp")}
          hint={t("settings.whatsappHint")}
          error={fieldError(errors.whatsappNumber?.message)}
        >
          {(field) => <Input type="tel" {...field} {...register("whatsappNumber")} />}
        </FormField>
      </fieldset>
      <fieldset className="space-y-4">
        <legend className="text-base font-semibold">{t("settings.invitations")}</legend>
        <FormField
          label={t("settings.validity")}
          hint={t("settings.validityHint", {
            min: SETTINGS_LIMITS.invitationDaysMin,
            max: SETTINGS_LIMITS.invitationDaysMax,
          })}
          error={fieldError(errors.invitationValidityDays?.message)}
        >
          {(field) => (
            <Input
              inputMode="numeric"
              className="sm:w-32"
              {...field}
              {...register("invitationValidityDays")}
            />
          )}
        </FormField>
      </fieldset>
      <Button
        type="submit"
        variant="primary"
        loading={isSubmitting}
        disabled={!isDirty}
        className="w-full sm:w-auto"
      >
        {t("client.account.save")}
      </Button>
    </form>
  );
}

/** Settings decided for this phase: receipt issuer, team WhatsApp, invitation validity. */
export function AdminSettingsPage() {
  const { t } = useTranslation();
  const settings = useAdminSettings();

  return (
    <div className="space-y-6">
      <PageHeader title={t("nav.admin.settings")} description={t("settings.subtitle")} />
      {settings.isPending && (
        <div aria-busy="true" className="max-w-xl space-y-4">
          <Skeleton className="h-16 w-full rounded-lg" />
          <Skeleton className="h-16 w-full rounded-lg" />
          <Skeleton className="h-24 w-full rounded-lg" />
        </div>
      )}
      {settings.isError && (
        <ErrorState error={settings.error} onRetry={() => void settings.refetch()} />
      )}
      {settings.data && <SettingsForm settings={settings.data} />}
      <ExpenseCategoriesSettings />
    </div>
  );
}
