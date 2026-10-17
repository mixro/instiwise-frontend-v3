import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { LanguageToggle } from "@/components/LanguageToggle";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Logo } from "@/components/brand/Logo";
import { currentLanguage } from "@/i18n";
import { getHealth } from "@/lib/api";
import { formatDate, formatTzs } from "@/lib/format";

// Demo numbers only. Real totals and balances are always calculated by the server.
const SAMPLE = { agreed: 1_200_000, paid: 750_000, deadline: "2026-11-28" };

function ApiStatus() {
  const { t } = useTranslation();
  const health = useQuery({ queryKey: ["health"], queryFn: getHealth, retry: false });

  if (health.isPending) {
    return <p className="text-sm text-muted">{t("starter.api.checking")}</p>;
  }
  if (health.isError) {
    return (
      <p className="inline-block rounded-lg bg-warning-bg px-3 py-2 text-sm text-warning-fg">
        {t("starter.api.unreachable")}
      </p>
    );
  }
  return (
    <p className="inline-block rounded-lg bg-brand-soft px-3 py-2 text-sm text-brand-text">
      {t("starter.api.connected", { version: health.data.version })}
    </p>
  );
}

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-surface-muted px-3 py-2">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="tabular mt-0.5 text-sm font-medium">{value}</dd>
    </div>
  );
}

export function StarterPage() {
  const { t } = useTranslation();
  const language = currentLanguage();
  const balance = SAMPLE.agreed - SAMPLE.paid;

  return (
    <div className="min-h-dvh">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-3">
          <Logo height={32} />
          <div className="ml-auto flex items-center gap-2">
            <LanguageToggle />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-8 px-4 py-10">
        <section className="space-y-3">
          <p className="text-sm font-medium text-brand-text">{t("starter.eyebrow")}</p>
          <h1 className="max-w-2xl text-3xl font-semibold tracking-tight">{t("starter.title")}</h1>
          <p className="max-w-2xl text-muted">{t("starter.subtitle")}</p>
          <ApiStatus />
        </section>

        <section aria-labelledby="sample-heading" className="space-y-3">
          <h2 id="sample-heading" className="text-sm font-medium text-muted">
            {t("starter.sample.heading")}
          </h2>
          <div className="rounded-xl border border-border bg-surface p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-medium">{t("starter.sample.title")}</p>
                <p className="text-sm text-muted">
                  {t("starter.sample.deadline")}: {formatDate(SAMPLE.deadline, language)}
                </p>
              </div>
              <span className="rounded-md bg-brand-soft px-2.5 py-1 text-xs font-medium text-brand-text">
                {t("starter.sample.status")}
              </span>
            </div>
            <dl className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
              <Figure
                label={t("starter.sample.agreed")}
                value={formatTzs(SAMPLE.agreed, language)}
              />
              <Figure label={t("starter.sample.paid")} value={formatTzs(SAMPLE.paid, language)} />
              <Figure label={t("starter.sample.balance")} value={formatTzs(balance, language)} />
            </dl>
            <p className="mt-3 text-xs text-muted">{t("starter.sample.note")}</p>
          </div>
        </section>
      </main>
    </div>
  );
}
