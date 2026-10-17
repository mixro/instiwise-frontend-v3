import { Minus, Plus } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/hooks/useLanguage";
import { formatDate, formatTzs } from "@/lib/format";
import type { ChangeRequest } from "./api";

function BeforeAfter({
  label,
  before,
  after,
  note,
}: {
  label: string;
  before: string;
  after: string;
  note: string;
}) {
  const { t } = useTranslation();
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <dt className="text-sm font-semibold">{label}</dt>
      <dd className="mt-2 space-y-2">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="block text-xs text-muted">{t("changes.before")}</span>
            <span className="tabular">{before}</span>
          </div>
          <div>
            <span className="block text-xs text-muted">{t("changes.after")}</span>
            <span className="tabular font-semibold">{after}</span>
          </div>
        </div>
        <p className="text-sm text-muted">{note}</p>
      </dd>
    </div>
  );
}

function ScopeList({
  icon,
  label,
  items,
  removed,
}: {
  icon: ReactNode;
  label: string;
  items: string[];
  removed?: boolean;
}) {
  if (items.length === 0) return null;
  return (
    <div className="space-y-1">
      <p className="flex items-center gap-2 text-sm font-medium">
        {icon}
        {label}
      </p>
      <ul className="space-y-1 pl-6 text-sm">
        {items.map((item) => (
          <li key={item} className={removed ? "text-muted line-through" : undefined}>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Before and after, side by side: price, deadline and scope. Differences come from
 * the server; additions and removals are labelled in words, not only by colour.
 */
export function ChangePreview({ change }: { change: ChangeRequest }) {
  const { t } = useTranslation();
  const language = useLanguage();
  const { before, after, priceDifference, scopeChanges } = change;

  const priceNote =
    priceDifference > 0
      ? t("changes.priceUp", { amount: formatTzs(priceDifference, language) })
      : priceDifference < 0
        ? t("changes.priceDown", { amount: formatTzs(-priceDifference, language) })
        : t("changes.noChange");

  const deadlineNote =
    after.deadline > before.deadline
      ? t("changes.deadlineLater")
      : after.deadline < before.deadline
        ? t("changes.deadlineEarlier")
        : t("changes.noChange");

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <p className="text-sm font-semibold">{t("changes.why")}</p>
        <p className="text-sm">{change.reason}</p>
      </div>
      <dl className="grid gap-2 sm:grid-cols-2">
        <BeforeAfter
          label={t("changes.price")}
          before={formatTzs(before.price, language)}
          after={formatTzs(after.price, language)}
          note={priceNote}
        />
        <BeforeAfter
          label={t("changes.deadline")}
          before={formatDate(before.deadline, language)}
          after={formatDate(after.deadline, language)}
          note={deadlineNote}
        />
      </dl>
      <div className="space-y-3 rounded-lg border border-border bg-surface p-4">
        <p className="text-sm font-semibold">{t("changes.scope")}</p>
        <ScopeList
          icon={<Plus className="size-4 text-brand-text" aria-hidden="true" />}
          label={t("changes.added")}
          items={scopeChanges.added}
        />
        <ScopeList
          icon={<Minus className="size-4 text-danger-fg" aria-hidden="true" />}
          label={t("changes.removed")}
          items={scopeChanges.removed}
          removed
        />
        {scopeChanges.added.length === 0 && scopeChanges.removed.length === 0 && (
          <p className="text-sm text-muted">{t("changes.noChange")}</p>
        )}
        {scopeChanges.unchanged.length > 0 && (
          <details className="text-sm">
            <summary className="flex min-h-11 cursor-pointer items-center text-muted sm:min-h-0">
              {t("changes.unchanged", { count: scopeChanges.unchanged.length })}
            </summary>
            <ul className="list-disc space-y-1 pt-2 pl-5">
              {scopeChanges.unchanged.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </details>
        )}
      </div>
    </div>
  );
}
