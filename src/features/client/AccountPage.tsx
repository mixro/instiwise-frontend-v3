import { LogOut } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ErrorState } from "@/components/ErrorState";
import { LanguageToggle } from "@/components/LanguageToggle";
import { PageHeader } from "@/components/PageHeader";
import { ThemeToggle } from "@/components/ThemeToggle";
import { EmailSettings } from "@/features/auth/EmailSettings";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { useErrorText } from "@/hooks/useErrorText";
import { useSession } from "@/hooks/useSession";
import { useToast } from "@/hooks/useToast";
import type { Language } from "@/i18n/languages";
import { clientApi } from "./api";
import { ProfileForm } from "./ProfileForm";
import { useProfile, useRefreshClient } from "./queries";

/** Profile, language, theme and sign-out. On phones this is where the toggles live. */
export function AccountPage() {
  const { t } = useTranslation();
  const { signOut } = useSession();
  const { apiError } = useErrorText();
  const { toast } = useToast();
  const refresh = useRefreshClient();
  const profile = useProfile();

  // The language is saved with the account (decided 2026-10-21), so it follows
  // the client to other devices. Name and phone are sent unchanged.
  async function saveLanguage(language: Language) {
    if (!profile.data) return;
    try {
      await clientApi.updateProfile({
        name: profile.data.name,
        phone: profile.data.phone,
        preferredLanguage: language,
      });
      toast({
        variant: "success",
        title: t("language.saved", { language: t(`language.${language}`) }),
      });
      void refresh();
    } catch (error) {
      toast({ variant: "error", title: t("language.saveFailed"), description: apiError(error) });
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader title={t("nav.client.account")} />

      <section aria-labelledby="profile-heading" className="space-y-4">
        <h2 id="profile-heading" className="text-base font-semibold">
          {t("client.account.profile")}
        </h2>
        {profile.isPending && (
          <div aria-busy="true" className="space-y-4">
            <Skeleton className="h-16 w-full rounded-lg" />
            <Skeleton className="h-16 w-full rounded-lg" />
            <Skeleton className="h-16 w-full rounded-lg" />
          </div>
        )}
        {profile.isError && (
          <ErrorState error={profile.error} onRetry={() => void profile.refetch()} />
        )}
        {profile.data && <ProfileForm profile={profile.data} />}
      </section>

      {profile.data && (
        <section
          aria-labelledby="email-heading"
          className="space-y-4 rounded-lg border border-border bg-surface p-4"
        >
          <h2 id="email-heading" className="text-base font-semibold">
            {t("auth.email.heading")}
          </h2>
          <EmailSettings
            email={profile.data.email}
            emailVerified={profile.data.emailVerified}
            pendingEmail={profile.data.pendingEmail}
            onChanged={() => void profile.refetch()}
          />
        </section>
      )}

      <section
        aria-labelledby="preferences-heading"
        className="space-y-4 rounded-lg border border-border bg-surface p-4"
      >
        <h2 id="preferences-heading" className="text-base font-semibold">
          {t("shell.preferences")}
        </h2>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <span className="text-sm text-muted">
            {t("language.label")}
            <span className="block text-xs">{t("language.hint")}</span>
          </span>
          <LanguageToggle onChange={(language) => void saveLanguage(language)} />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <span className="text-sm text-muted">{t("theme.label")}</span>
          <ThemeToggle />
        </div>
      </section>

      <Button onClick={signOut} className="w-full sm:w-auto">
        <LogOut className="size-4" aria-hidden="true" />
        {t("shell.signOut")}
      </Button>
    </div>
  );
}
