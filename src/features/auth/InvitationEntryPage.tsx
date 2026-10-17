import { zodResolver } from "@hookform/resolvers/zod";
import { Suspense } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { FormField } from "@/components/FormField";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useErrorText } from "@/hooks/useErrorText";
import { parseInvitationInput } from "@/lib/invitation-code";
import { AuthCard } from "./AuthCard";
import { TextLink } from "./TextLink";
import { DemoHints } from "./demo-hints";
import { invitationEntrySchema, type InvitationEntryValues } from "./schemas";

/** Paste the link from WhatsApp/SMS or type the code; both lead to /invite/CODE. */
export function InvitationEntryPage() {
  const { t } = useTranslation();
  const { fieldError } = useErrorText();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<InvitationEntryValues>({
    resolver: zodResolver(invitationEntrySchema),
    // First check on submit, then live as fields change. Validating on blur shifted the
    // layout under the pointer and swallowed the first click on the submit button.
    mode: "onSubmit",
    reValidateMode: "onChange",
    defaultValues: { invitation: "" },
  });

  function onSubmit({ invitation }: InvitationEntryValues) {
    const code = parseInvitationInput(invitation);
    if (code) navigate(`/invite/${code}`);
  }

  return (
    <AuthCard
      title={t("auth.invite.title")}
      description={t("auth.invite.subtitle")}
      footer={
        <>
          {t("auth.invite.haveAccount")} <TextLink to="/login">{t("auth.invite.signIn")}</TextLink>
        </>
      }
      after={
        DemoHints && (
          <Suspense fallback={null}>
            <DemoHints show="codes" />
          </Suspense>
        )
      }
    >
      <form noValidate onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          label={t("auth.invite.field")}
          hint={t("auth.invite.hint")}
          error={fieldError(errors.invitation?.message)}
        >
          {(control) => (
            <Input
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              {...control}
              {...register("invitation")}
            />
          )}
        </FormField>
        <Button type="submit" variant="primary" className="w-full">
          {t("auth.invite.submit")}
        </Button>
      </form>
    </AuthCard>
  );
}
