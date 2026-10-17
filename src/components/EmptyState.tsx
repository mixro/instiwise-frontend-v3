import { Inbox, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface EmptyStateProps {
  /** Already translated. Say what is missing: "No payments recorded yet". */
  title: string;
  /** What happens next or how to fill it. */
  description?: string;
  icon?: LucideIcon;
  /** Usually one Button. */
  action?: ReactNode;
  /** "danger" for load failures. */
  tone?: "neutral" | "danger";
  /** "h1" when the empty state is the whole page (404, no access). */
  titleAs?: "p" | "h1";
  className?: string;
}

export function EmptyState({
  title,
  description,
  icon: Icon = Inbox,
  action,
  tone = "neutral",
  titleAs: Title = "p",
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-2 rounded-lg border border-dashed border-border-strong bg-surface px-6 py-12 text-center",
        className,
      )}
    >
      <span
        className={cn(
          "mb-2 inline-flex size-12 items-center justify-center rounded-full",
          tone === "danger" ? "bg-danger-bg text-danger-fg" : "bg-surface-muted text-muted",
        )}
      >
        <Icon className="size-6" aria-hidden="true" />
      </span>
      <Title
        className={cn(
          Title === "h1" ? "text-xl font-semibold" : "text-sm font-medium",
          tone === "danger" && "text-danger-fg",
        )}
      >
        {title}
      </Title>
      {description && <p className="max-w-sm text-sm text-muted">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
