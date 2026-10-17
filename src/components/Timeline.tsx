import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/Skeleton";
import { useLanguage } from "@/hooks/useLanguage";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/format";

export interface TimelineItem {
  id: string;
  /** Already translated or user-written text. */
  title: string;
  /** ISO date from the server. */
  date: string;
  description?: ReactNode;
  /** Small line under the title: author, visibility. */
  meta?: string;
  /** e.g. a StatusBadge. */
  badge?: ReactNode;
}

interface TimelineProps {
  /** In the order to show them; the server decides (newest first for progress). */
  items: TimelineItem[];
  loading?: boolean;
  /** Shown when there are no items, usually an EmptyState. */
  empty?: ReactNode;
  className?: string;
}

const LOADING_ITEMS = 3;

export function Timeline({ items, loading, empty, className }: TimelineProps) {
  const language = useLanguage();

  if (loading) {
    return (
      <div aria-busy="true" className={cn("flex flex-col gap-6", className)}>
        {Array.from({ length: LOADING_ITEMS }, (_, index) => (
          <div key={index} className="flex gap-4">
            <Skeleton className="mt-1 size-3 rounded-full" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-3 w-1/4" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (items.length === 0) return <>{empty}</>;

  return (
    <ol className={cn("relative", className)}>
      {items.map((item, index) => (
        <li key={item.id} className="relative flex gap-4 pb-6 last:pb-0">
          {/* Hairline joining this dot to the next one. */}
          {index < items.length - 1 && (
            <span aria-hidden="true" className="absolute top-4 bottom-0 left-1.5 w-px bg-border" />
          )}
          <span
            aria-hidden="true"
            className="relative mt-1 size-3 shrink-0 rounded-full border-2 border-brand-text bg-surface"
          />
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-medium">{item.title}</p>
              {item.badge}
            </div>
            <p className="text-xs text-muted">
              <time dateTime={item.date}>{formatDate(item.date, language)}</time>
              {item.meta && <> · {item.meta}</>}
            </p>
            {item.description && <div className="text-sm text-muted">{item.description}</div>}
          </div>
        </li>
      ))}
    </ol>
  );
}
