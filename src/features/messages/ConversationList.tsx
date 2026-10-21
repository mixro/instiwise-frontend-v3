import { MessagesSquare, Search, X } from "lucide-react";
import { useId, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Skeleton } from "@/components/ui/Skeleton";
import { useLanguage } from "@/hooks/useLanguage";
import { cn } from "@/lib/cn";
import { formatDateTime } from "@/lib/format";
import type { ConversationPage, ConversationSummary } from "./api";
import type { StaffRole } from "./queries";

export interface InboxFilters {
  q?: string;
  unread?: boolean;
}

interface ConversationListProps {
  role: StaffRole;
  /** /operator/messages or /admin/messages: rows link to `${base}/${projectId}`. */
  base: string;
  conversations: {
    data: ConversationPage | undefined;
    isPending: boolean;
    isError: boolean;
    error: unknown;
    refetch: () => Promise<unknown>;
  };
  filters: InboxFilters;
  onFiltersChange: (filters: InboxFilters) => void;
  selectedId?: string;
}

function Row({
  role,
  conversation,
  to,
  selected,
}: {
  role: StaffRole;
  conversation: ConversationSummary;
  to: string;
  selected: boolean;
}) {
  const { t } = useTranslation();
  const language = useLanguage();
  const last = conversation.lastMessage;
  const unread = conversation.unreadCount;
  // An operator's own messages read "You: …"; admins see who wrote.
  const prefix = !last
    ? ""
    : role === "OPERATOR" && last.senderRole === "OPERATOR"
      ? t("inbox.youPrefix")
      : role === "ADMIN"
        ? `${last.senderName}: `
        : "";

  return (
    <Link
      to={to}
      aria-current={selected ? "page" : undefined}
      className={cn(
        "block rounded-md border px-4 py-3 transition-colors",
        selected
          ? "border-brand-text bg-brand-soft"
          : "border-border bg-surface hover:bg-surface-muted",
      )}
    >
      <span className="flex items-baseline justify-between gap-3">
        <span className={cn("truncate", unread > 0 ? "font-semibold" : "font-medium")}>
          {conversation.clientName}
        </span>
        {last && (
          <time dateTime={last.sentAt} className="shrink-0 text-xs text-muted">
            {formatDateTime(last.sentAt, language)}
          </time>
        )}
      </span>
      <span className="block truncate text-xs text-muted">
        {conversation.projectTitle} · {conversation.projectReference}
      </span>
      {role === "ADMIN" && (
        <span className="block truncate text-xs text-muted">
          {conversation.operatorName
            ? t("inbox.operatorLabel", { name: conversation.operatorName })
            : t("inbox.noOperator")}
        </span>
      )}
      <span className="mt-1 flex items-start justify-between gap-3">
        <span
          className={cn(
            "line-clamp-2 text-sm break-words",
            unread > 0 ? "text-foreground" : "text-muted",
          )}
        >
          {last ? `${prefix}${last.preview}` : t("inbox.noMessages")}
        </span>
        {unread > 0 && (
          <span className="shrink-0 rounded-full bg-brand-text px-2 py-0.5 text-xs font-semibold text-surface">
            {role === "OPERATOR"
              ? t("inbox.unread", { count: unread })
              : t("inbox.waiting", { count: unread })}
          </span>
        )}
      </span>
    </Link>
  );
}

/** Search, an unread filter and one row per project conversation. */
export function ConversationList({
  role,
  base,
  conversations,
  filters,
  onFiltersChange,
  selectedId,
}: ConversationListProps) {
  const { t } = useTranslation();
  const searchId = useId();
  const hintId = useId();
  // Searching on submit, not on every key: an admin's every search is audited.
  const [draft, setDraft] = useState(filters.q ?? "");
  const items = conversations.data?.items ?? [];
  const filtered = Boolean(filters.q || filters.unread);

  function search(event: FormEvent) {
    event.preventDefault();
    onFiltersChange({ ...filters, q: draft.trim() || undefined });
  }

  return (
    <div className="space-y-4">
      <form role="search" onSubmit={search} className="space-y-2">
        <Label htmlFor={searchId}>{t("inbox.search")}</Label>
        <p id={hintId} className="-mt-1 text-sm text-muted">
          {t("inbox.searchHint")}
        </p>
        <div className="flex gap-2">
          <Input
            id={searchId}
            type="search"
            value={draft}
            maxLength={100}
            aria-describedby={hintId}
            className="min-w-0"
            onChange={(event) => setDraft(event.target.value)}
          />
          <Button type="submit" className="relative shrink-0">
            <Search className="size-4" aria-hidden="true" />
            <span className="sr-only sm:not-sr-only">{t("inbox.searchButton")}</span>
          </Button>
        </div>
        {filters.q && (
          <button
            type="button"
            onClick={() => {
              setDraft("");
              onFiltersChange({ ...filters, q: undefined });
            }}
            className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-brand-text underline underline-offset-4 sm:min-h-0"
          >
            <X className="size-3.5" aria-hidden="true" />
            {t("inbox.clearSearch")}
          </button>
        )}
      </form>

      <div role="group" aria-label={t("inbox.show")} className="flex gap-2">
        {[
          { unread: false, label: t("inbox.filterAll") },
          { unread: true, label: t("inbox.filterUnread") },
        ].map((option) => (
          <Button
            key={option.label}
            size="sm"
            variant={Boolean(filters.unread) === option.unread ? "primary" : "secondary"}
            aria-pressed={Boolean(filters.unread) === option.unread}
            onClick={() => onFiltersChange({ ...filters, unread: option.unread || undefined })}
          >
            {option.label}
          </Button>
        ))}
      </div>

      {conversations.isPending && (
        <div aria-busy="true" className="space-y-2">
          {[0, 1, 2].map((key) => (
            <Skeleton key={key} className="h-24 w-full rounded-md" />
          ))}
        </div>
      )}

      {conversations.isError && (
        <ErrorState error={conversations.error} onRetry={() => void conversations.refetch()} />
      )}

      {conversations.data && items.length === 0 && (
        <EmptyState
          icon={MessagesSquare}
          title={
            !filtered
              ? t(`inbox.empty.${role}`)
              : filters.unread && !filters.q
                ? t("inbox.noUnread")
                : t("inbox.noMatches")
          }
          description={filtered ? undefined : t(`inbox.emptyBody.${role}`)}
        />
      )}

      {items.length > 0 && (
        <ul aria-label={t("inbox.listLabel")} className="space-y-2">
          {items.map((conversation) => (
            <li key={conversation.projectId}>
              <Row
                role={role}
                conversation={conversation}
                to={`${base}/${conversation.projectId}`}
                selected={conversation.projectId === selectedId}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
