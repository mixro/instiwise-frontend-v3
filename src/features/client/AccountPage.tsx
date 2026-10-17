import { LogOut } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ErrorState } from "@/components/ErrorState";
import { LanguageToggle } from "@/components/LanguageToggle";
import { PageHeader } from "@/components/PageHeader";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { useSession } from "@/hooks/useSession";
import { ProfileForm } from "./ProfileForm";
import { useProfile } from "./queries";

/** Profile, language, theme and sign-out. On phones this is where the toggles live. */
export function AccountPage() {
  const { t } = useTranslation();
  const { signOut } = useSession();
  const profile = useProfile();

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

      <section
        aria-labelledby="preferences-heading"
        className="space-y-4 rounded-lg border border-border bg-surface p-4"
      >
        <h2 id="preferences-heading" className="text-base font-semibold">
          {t("shell.preferences")}
        </h2>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <span className="text-sm text-muted">{t("language.label")}</span>
          <LanguageToggle />
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
