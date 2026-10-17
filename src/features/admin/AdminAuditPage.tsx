import { useId, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { useErrorText } from "@/hooks/useErrorText";
import { AUDIT_ACTIONS, type AuditAction, type AuditFilters } from "./api";
import { AuditList } from "./AuditList";
import { useAuditLog } from "./queries";

const ALL = "all";

/** The audit log (brief 5.3), filtered on the server by user, action and date range. */
export function AdminAuditPage() {
  const { t } = useTranslation();
  const { apiError } = useErrorText();
  const ids = { actor: useId(), action: useId(), from: useId(), to: useId() };
  const [draft, setDraft] = useState<AuditFilters>({});
  const [filters, setFilters] = useState<AuditFilters>({});
  const audit = useAuditLog(filters);
  const filtered = Object.values(filters).some(Boolean);
  const invalidRange = Boolean(draft.from && draft.to && draft.from > draft.to);

  function apply(event: FormEvent) {
    event.preventDefault();
    if (!invalidRange) setFilters(draft);
  }

  function clear() {
    setDraft({});
    setFilters({});
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t("nav.admin.auditLogs")} description={t("audit.subtitle")} />

      <form
        onSubmit={apply}
        aria-label={t("audit.filters")}
        className="grid gap-4 rounded-lg border border-border bg-surface p-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <div className="flex flex-col gap-2">
          <Label htmlFor={ids.actor}>{t("audit.user")}</Label>
          <Select
            value={draft.actor ?? ALL}
            onValueChange={(value) =>
              setDraft((d) => ({ ...d, actor: value === ALL ? undefined : value }))
            }
          >
            <SelectTrigger id={ids.actor}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t("audit.allUsers")}</SelectItem>
              {(audit.data?.actors ?? []).map((actor) => (
                <SelectItem key={actor} value={actor}>
                  {actor}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor={ids.action}>{t("audit.action")}</Label>
          <Select
            value={draft.action ?? ALL}
            onValueChange={(value) =>
              setDraft((d) => ({
                ...d,
                action: value === ALL ? undefined : (value as AuditAction),
              }))
            }
          >
            <SelectTrigger id={ids.action}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t("audit.allActions")}</SelectItem>
              {AUDIT_ACTIONS.map((action) => (
                <SelectItem key={action} value={action}>
                  {t(`audit.actions.${action}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor={ids.from}>{t("audit.from")}</Label>
          <Input
            id={ids.from}
            type="date"
            value={draft.from ?? ""}
            onChange={(event) => setDraft((d) => ({ ...d, from: event.target.value || undefined }))}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor={ids.to}>{t("audit.to")}</Label>
          <Input
            id={ids.to}
            type="date"
            value={draft.to ?? ""}
            aria-invalid={invalidRange || undefined}
            aria-describedby={invalidRange ? `${ids.to}-error` : undefined}
            onChange={(event) => setDraft((d) => ({ ...d, to: event.target.value || undefined }))}
          />
          {invalidRange && (
            <p id={`${ids.to}-error`} className="text-sm text-danger-fg">
              {t("validation.dateRange")}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-2 sm:col-span-2 sm:flex-row lg:col-span-4">
          <Button type="submit" variant="primary">
            {t("audit.apply")}
          </Button>
          <Button onClick={clear} disabled={!filtered && !Object.values(draft).some(Boolean)}>
            {t("audit.clear")}
          </Button>
        </div>
      </form>

      <AuditList
        entries={audit.data?.entries ?? []}
        loading={audit.isPending}
        error={audit.isError ? apiError(audit.error) : undefined}
        onRetry={() => void audit.refetch()}
        empty={
          filtered
            ? {
                title: t("audit.noMatches"),
                action: <Button onClick={clear}>{t("audit.clear")}</Button>,
              }
            : { title: t("audit.empty") }
        }
      />
    </div>
  );
}
