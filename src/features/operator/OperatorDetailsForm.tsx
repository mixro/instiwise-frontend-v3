import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { FormAlert } from "@/components/FormAlert";
import { FormField } from "@/components/FormField";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { nameField, requiredPhone } from "@/features/auth/schemas";
import { useErrorText } from "@/hooks/useErrorText";
import { useSession } from "@/hooks/useSession";
import { useToast } from "@/hooks/useToast";
import { formatTzPhone, normalizeTzPhone } from "@/lib/phone";
import { operatorApi, type OperatorProfile } from "./api";

// Decided 2026-10-21: operators edit their name and phone (kept, as at registration);
// email, role, status and permissions are read-only here.
const schema = z.object({ name: nameField, phone: requiredPhone });
type Values = z.infer<typeof schema>;

export function OperatorDetailsForm({
  profile,
  onSaved,
}: {
  profile: OperatorProfile;
  onSaved: (saved: OperatorProfile) => void;
}) {
  const { t } = useTranslation();
  const { fieldError, apiError } = useErrorText();
  const { toast } = useToast();
  const { user, signIn } = useSession();
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
    defaultValues: { name: profile.name, phone: formatTzPhone(profile.phone) },
  });

  async function onSubmit(values: Values) {
    setFormError(undefined);
    try {
      const saved = await operatorApi.updateProfile({
        name: values.name,
        phone: normalizeTzPhone(values.phone) ?? values.phone,
      });
      reset({ name: saved.name, phone: formatTzPhone(saved.phone) });
      if (user) signIn({ ...user, name: saved.name });
      toast({ variant: "success", title: t("client.account.saved") });
      onSaved(saved);
    } catch (error) {
      setFormError(apiError(error));
    }
  }

  return (
    <form noValidate onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {formError && <FormAlert>{formError}</FormAlert>}
      <FormField label={t("auth.fields.name")} error={fieldError(errors.name?.message)}>
        {(control) => <Input autoComplete="name" {...control} {...register("name")} />}
      </FormField>
      <FormField
        label={t("auth.fields.phone")}
        hint={t("auth.register.phoneHint")}
        error={fieldError(errors.phone?.message)}
      >
        {(control) => (
          <Input
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            {...control}
            {...register("phone")}
          />
        )}
      </FormField>
      <FormField label={t("auth.fields.email")} hint={t("operator.profile.emailHint")}>
        {(control) => <Input type="email" value={profile.email} readOnly {...control} />}
      </FormField>
      <FormField label={t("operator.profile.role")}>
        {(control) => <Input value={t("roles.OPERATOR")} readOnly {...control} />}
      </FormField>
      <Button
        type="submit"
        variant="primary"
        loading={isSubmitting}
        disabled={!isDirty}
        className="w-full sm:w-auto"
      >
        {isSubmitting ? t("client.account.saving") : t("client.account.save")}
      </Button>
    </form>
  );
}
