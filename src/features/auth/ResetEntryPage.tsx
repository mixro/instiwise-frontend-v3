import { zodResolver } from "@hookform/resolvers/zod";
import { Suspense } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { FormField } from "@/components/FormField";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useErrorText } from "@/hooks/useErrorText";
import { parseResetCodeInput } from "@/lib/invitation-code";
import { AuthCard } from "./AuthCard";
import { TextLink } from "./TextLink";
import { DemoHints } from "./demo-hints";
import { resetEntrySchema, type ResetEntryValues } from "./schemas";

/**
 * /reset: no reset emails (ADR 0005). The admin sends a code on WhatsApp; paste
 * the link or type the code, and both lead to /reset/CODE.
 */
export function ResetEntryPage() {
  const { t } = useTranslation();
  const { fieldError } = useErrorText();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetEntryValues>({
    resolver: zodResolver(resetEntrySchema),
    mode: "onSubmit",
    reValidateMode: "onChange",
    defaultValues: { code: "" },
  });

  function onSubmit({ code }: ResetEntryValues) {
    const parsed = parseResetCodeInput(code);
    if (parsed) navigate(`/reset/${parsed}`);
  }

  return (
    <AuthCard
      title={t("auth.reset.title")}
      description={
        <>
          <p>{t("auth.reset.askAdmin")}</p>
          <p>{t("auth.reset.enterIt")}</p>
        </>
      }
      footer={
        <>
          {t("auth.reset.remembered")} <TextLink to="/login">{t("auth.reset.signIn")}</TextLink>
        </>
      }
      after={
        DemoHints && (
          <Suspense fallback={null}>
            <DemoHints show="resetCodes" />
          </Suspense>
        )
      }
    >
      <form noValidate onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          label={t("auth.reset.field")}
          hint={t("auth.reset.hint")}
          error={fieldError(errors.code?.message)}
        >
          {(control) => (
            <Input
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              {...control}
              {...register("code")}
            />
          )}
        </FormField>
        <Button type="submit" variant="primary" className="w-full">
          {t("auth.reset.submit")}
        </Button>
      </form>
    </AuthCard>
  );
}
