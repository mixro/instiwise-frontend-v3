import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

/**
 * Scrolls sideways inside its border on narrow screens instead of squashing columns.
 * The scroll box is focusable so keyboard users can scroll it with the arrow keys.
 */
export function Table({ className, ...props }: ComponentProps<"table">) {
  return (
    <div tabIndex={0} className="w-full overflow-x-auto rounded-lg border border-border bg-surface">
      <table className={cn("w-full border-collapse text-sm", className)} {...props} />
    </div>
  );
}

export function TableHeader({ className, ...props }: ComponentProps<"thead">) {
  return <thead className={cn("bg-surface-muted [&_tr]:border-b", className)} {...props} />;
}

export function TableBody({ className, ...props }: ComponentProps<"tbody">) {
  return <tbody className={cn("[&_tr:last-child]:border-0", className)} {...props} />;
}

/** Set data-state="selected" to highlight a chosen row. */
export function TableRow({ className, ...props }: ComponentProps<"tr">) {
  return (
    <tr
      className={cn(
        "border-b border-border transition-colors hover:bg-surface-muted data-[state=selected]:bg-brand-soft",
        className,
      )}
      {...props}
    />
  );
}

type CellProps = {
  /** Right-aligned tabular figures, for amounts and counts. */
  numeric?: boolean;
};

export function TableHead({ className, numeric, ...props }: ComponentProps<"th"> & CellProps) {
  return (
    <th
      scope="col"
      className={cn(
        "h-10 px-4 text-left align-middle text-xs font-medium whitespace-nowrap text-muted",
        numeric && "text-right",
        className,
      )}
      {...props}
    />
  );
}

export function TableCell({ className, numeric, ...props }: ComponentProps<"td"> & CellProps) {
  return (
    <td
      className={cn(
        "h-12 px-4 align-middle",
        numeric && "tabular text-right whitespace-nowrap",
        className,
      )}
      {...props}
    />
  );
}

export function TableCaption({ className, ...props }: ComponentProps<"caption">) {
  return (
    <caption
      className={cn("caption-bottom px-4 py-2 text-left text-xs text-muted", className)}
      {...props}
    />
  );
}
