import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface PageHeaderProps {
  title: string;
  /** 1 for the page title (one per page). 2 when the header sits inside another page or a panel. */
  level?: 1 | 2;
  description?: string;
  /** Shown next to the title, e.g. a StatusBadge. */
  badge?: ReactNode;
  /** Buttons; the primary action goes last so it sits on the right. */
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  level = 1,
  description,
  badge,
  actions,
  className,
}: PageHeaderProps) {
  const Heading = level === 1 ? "h1" : "h2";
  return (
    <header
      className={cn(
        "flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-start sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Heading className="text-2xl font-semibold tracking-tight">{title}</Heading>
          {badge}
        </div>
        {description && <p className="max-w-2xl text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </header>
  );
}
