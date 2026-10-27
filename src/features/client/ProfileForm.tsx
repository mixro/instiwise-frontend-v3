import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { FormAlert } from "@/components/FormAlert";
import { FormField } from "@/components/FormField";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { nameField, optionalPhoneField } from "@/features/auth/schemas";
import { useErrorText } from "@/hooks/useErrorText";
import { useSession } from "@/hooks/useSession";
import { useToast } from "@/hooks/useToast";
import { formatTzPhone, normalizeTzPhone } from "@/lib/phone";
import { clientApi, type Profile } from "./api";
import { useRefreshClient } from "./queries";

// Decided 2026-10-17: clients edit their name and phone here; the email has its own section
// (EmailSettings), because a new address waits for confirmation (ADR 0006).
const profileSchema = z.object({ name: nameField, phone: optionalPhoneField });
type ProfileValues = z.infer<typeof profileSchema>;

export function ProfileForm({ profile }: { profile: Profile }) {
  const { t } = useTranslation();
  const { fieldError, apiError } = useErrorText();
  const { toast } = useToast();
  const { user, signIn } = useSession();
  const refresh = useRefreshClient();
  const [formError, setFormError] = useState<string>();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    mode: "onSubmit",
    reValidateMode: "onChange",
    defaultValues: {
      name: profile.name,
      phone: profile.phone ? formatTzPhone(profile.phone) : "",
    },
  });

  async function onSubmit(values: ProfileValues) {
    setFormError(undefined);
    try {
      const saved = await clientApi.updateProfile({
        name: values.name,
        phone: normalizeTzPhone(values.phone) ?? undefined,
      });
      reset({ name: saved.name, phone: saved.phone ? formatTzPhone(saved.phone) : "" });
      if (user) signIn({ ...user, name: saved.name });
      toast({ variant: "success", title: t("client.account.saved") });
      void refresh();
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
        hint={t("auth.register.clientPhoneHint")}
        optional
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
