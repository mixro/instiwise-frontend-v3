import { useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { ErrorState } from "@/components/ErrorState";
import { LanguageToggle } from "@/components/LanguageToggle";
import { PageHeader } from "@/components/PageHeader";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Skeleton } from "@/components/ui/Skeleton";
import { ChangePasswordForm } from "@/features/auth/ChangePasswordForm";
import { EmailSettings } from "@/features/auth/EmailSettings";
import { useErrorText } from "@/hooks/useErrorText";
import { useToast } from "@/hooks/useToast";
import type { Language } from "@/i18n/languages";
import { operatorApi, type OperatorProfile } from "./api";
import { OperatorAccess } from "./OperatorAccess";
import { OperatorDetailsForm } from "./OperatorDetailsForm";
import { operatorKeys, useOperatorProfile } from "./queries";

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section
      aria-labelledby={id}
      className="space-y-4 rounded-lg border border-border bg-surface p-4 sm:p-6"
    >
      <h2 id={id} className="text-base font-semibold">
        {title}
      </h2>
      {children}
    </section>
  );
}

/**
 * The operator's own profile (decided 2026-10-21): name and phone editable;
 * email, role, status, the assigned-client count and permissions read-only;
 * the language is saved with the account; change password.
 */
export function OperatorProfilePage() {
  const { t } = useTranslation();
  const { apiError } = useErrorText();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const profile = useOperatorProfile();

  function store(saved: OperatorProfile) {
    queryClient.setQueryData(operatorKeys.profile(), saved);
  }

  async function saveLanguage(language: Language) {
    try {
      store(await operatorApi.updateProfile({ preferredLanguage: language }));
      toast({
        variant: "success",
        title: t("language.saved", { language: t(`language.${language}`) }),
      });
    } catch (error) {
      toast({ variant: "error", title: t("language.saveFailed"), description: apiError(error) });
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t("nav.operator.profile")} description={t("operator.profile.subtitle")} />

      {profile.isPending && (
        <div aria-busy="true" className="space-y-4">
          <Skeleton className="h-64 w-full rounded-lg" />
          <Skeleton className="h-48 w-full rounded-lg" />
        </div>
      )}
      {profile.isError && (
        <ErrorState error={profile.error} onRetry={() => void profile.refetch()} />
      )}

      {profile.data && (
        <>
          <Section id="details-heading" title={t("operator.profile.details")}>
            <OperatorDetailsForm profile={profile.data} onSaved={store} />
          </Section>

          <Section id="email-heading" title={t("auth.email.heading")}>
            <EmailSettings
              email={profile.data.email}
              emailVerified={profile.data.emailVerified}
              pendingEmail={profile.data.pendingEmail}
              onChanged={() => void profile.refetch()}
            />
          </Section>

          <Section id="access-heading" title={t("operator.profile.access")}>
            <OperatorAccess profile={profile.data} />
          </Section>

          <Section id="preferences-heading" title={t("shell.preferences")}>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium">{t("language.label")}</p>
                <p className="text-sm text-muted">{t("language.hint")}</p>
              </div>
              <LanguageToggle onChange={(language) => void saveLanguage(language)} />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <p className="text-sm font-medium">{t("theme.label")}</p>
              <ThemeToggle />
            </div>
          </Section>

          <Section id="password-heading" title={t("operator.profile.password.title")}>
            <ChangePasswordForm />
          </Section>
        </>
      )}
    </div>
  );
}
