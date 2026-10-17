import { FileSignature } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { useErrorText } from "@/hooks/useErrorText";
import { useLanguage } from "@/hooks/useLanguage";
import { useToast } from "@/hooks/useToast";
import { formatDate, formatDateTime, formatTzs } from "@/lib/format";
import { clientApi, type AgreementVersion } from "./api";
import { useProjectId } from "./project-tabs";
import { useAgreement, useRefreshClient } from "./queries";

function TermsList({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div className="space-y-1">
      <h3 className="text-sm font-semibold">{title}</h3>
      <ul className="list-disc space-y-1 pl-5 text-sm">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function VersionTerms({ version }: { version: AgreementVersion }) {
  const { t } = useTranslation();
  const language = useLanguage();
  return (
    <div className="space-y-4">
      <dl className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <dt className="text-muted">{t("client.agreement.price")}</dt>
          <dd className="tabular text-lg font-semibold">{formatTzs(version.price, language)}</dd>
        </div>
        <div>
          <dt className="text-muted">{t("client.project.deadline")}</dt>
          <dd className="text-lg font-semibold">{formatDate(version.deadline, language)}</dd>
        </div>
      </dl>
      <TermsList title={t("client.agreement.scope")} items={version.scope} />
      <TermsList title={t("client.agreement.exclusions")} items={version.exclusions} />
      <TermsList title={t("client.agreement.paymentTerms")} items={version.paymentTerms} />
    </div>
  );
}

/**
 * The agreement version in force (or waiting for acceptance) and the ones it replaced.
 * Accepting is an explicit, confirmed action; versions are never edited (brief section 9).
 */
export function AgreementTab() {
  const { t } = useTranslation();
  const language = useLanguage();
  const { apiError } = useErrorText();
  const { toast } = useToast();
  const projectId = useProjectId();
  const agreement = useAgreement(projectId);
  const refresh = useRefreshClient();
  const [confirming, setConfirming] = useState(false);
  const [acceptError, setAcceptError] = useState<string>();

  if (agreement.isPending) {
    return (
      <div aria-busy="true" className="space-y-3">
        <Skeleton className="h-6 w-1/2" />
        <Skeleton className="h-40 w-full rounded-lg" />
      </div>
    );
  }
  if (agreement.isError) {
    return <ErrorState error={agreement.error} onRetry={() => void agreement.refetch()} />;
  }

  const [current, ...earlier] = agreement.data.versions;
  if (!current) {
    return <EmptyState icon={FileSignature} title={t("client.agreement.none")} />;
  }
  const awaiting = current.status === "AWAITING_ACCEPTANCE";

  async function accept() {
    if (!current) return;
    setAcceptError(undefined);
    try {
      await clientApi.acceptAgreement(projectId, current.version);
    } catch (error) {
      setAcceptError(apiError(error));
      throw error;
    }
    toast({
      variant: "success",
      title: t("client.agreement.accepted", { version: current.version }),
    });
    void refresh();
  }

  return (
    <div className="space-y-6">
      <section
        aria-labelledby="agreement-current"
        className="space-y-4 rounded-lg border border-border bg-surface p-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="agreement-current" className="text-base font-semibold">
            {t("client.agreement.version", { version: current.version })}
          </h2>
          <StatusBadge kind="agreement" status={current.status} />
        </div>

        {awaiting ? (
          <p className="rounded-lg bg-warning-bg px-4 py-3 text-sm text-warning-fg">
            {t("client.agreement.reviewPrompt")}
          </p>
        ) : (
          current.acceptedAt && (
            <p className="text-sm text-muted">
              {t("client.agreement.acceptedBy", {
                name: current.acceptedBy,
                date: formatDateTime(current.acceptedAt, language),
              })}
            </p>
          )
        )}

        <VersionTerms version={current} />

        {awaiting && (
          <Button
            variant="primary"
            className="w-full sm:w-auto"
            onClick={() => setConfirming(true)}
          >
            {t("client.agreement.accept", { version: current.version })}
          </Button>
        )}
      </section>

      {earlier.length > 0 && (
        <section aria-labelledby="agreement-history" className="space-y-2">
          <h2 id="agreement-history" className="text-base font-semibold">
            {t("client.agreement.history")}
          </h2>
          {earlier.map((version) => (
            <details
              key={version.version}
              className="rounded-lg border border-border bg-surface px-4 py-2"
            >
              <summary className="flex min-h-11 cursor-pointer flex-wrap items-center gap-2 text-sm font-medium">
                {t("client.agreement.version", { version: version.version })}
                <StatusBadge kind="agreement" status={version.status} />
                {version.acceptedAt && (
                  <span className="font-normal text-muted">
                    {t("client.agreement.acceptedOn", {
                      date: formatDate(version.acceptedAt, language),
                    })}
                  </span>
                )}
              </summary>
              <div className="pt-2 pb-2">
                <VersionTerms version={version} />
              </div>
            </details>
          ))}
        </section>
      )}

      <ConfirmDialog
        open={confirming}
        onOpenChange={(open) => {
          setConfirming(open);
          if (!open) setAcceptError(undefined);
        }}
        title={t("client.agreement.confirmTitle", { version: current.version })}
        description={t("client.agreement.confirmBody", {
          price: formatTzs(current.price, language),
          date: formatDate(current.deadline, language),
        })}
        confirmLabel={t("client.agreement.accept", { version: current.version })}
        error={acceptError}
        onConfirm={accept}
      />
    </div>
  );
}
