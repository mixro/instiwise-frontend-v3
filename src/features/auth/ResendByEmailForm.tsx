import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { FormField } from "@/components/FormField";
import { Input } from "@/components/ui/Input";
import { useErrorText } from "@/hooks/useErrorText";
import { requestVerificationEmail } from "./api";
import { ResendButton } from "./ResendButton";
import { emailOnlySchema, type EmailOnlyValues } from "./schemas";

/**
 * Signed out: ask for a new confirmation link by address (ADR 0006). The server
 * answers the same for every address; the limits still show as a countdown.
 */
export function ResendByEmailForm() {
  const { t } = useTranslation();
  const { fieldError } = useErrorText();
  const {
    register,
    trigger,
    getValues,
    formState: { errors },
  } = useForm<EmailOnlyValues>({
    resolver: zodResolver(emailOnlySchema),
    mode: "onSubmit",
    reValidateMode: "onChange",
    defaultValues: { email: "" },
  });

  return (
    <form noValidate onSubmit={(event) => event.preventDefault()} className="space-y-3 text-left">
      <FormField label={t("auth.resend.field")} error={fieldError(errors.email?.message)}>
        {(control) => (
          <Input
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            {...control}
            {...register("email")}
          />
        )}
      </FormField>
      <ResendButton
        send={async () => {
          // Invalid input: the inline error shows, and nothing is sent.
          if (!(await trigger())) return null;
          await requestVerificationEmail(getValues("email").trim());
        }}
      />
    </form>
  );
}
