import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface StateCellProps {
  label: string;
  /** Spans the whole row (tables, tabs). */
  wide?: boolean;
  children: ReactNode;
}

export function StateCell({ label, wide, children }: StateCellProps) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-2", wide && "col-span-full")}>
      <p className="text-xs font-medium tracking-wide text-muted uppercase">{label}</p>
      {children}
    </div>
  );
}
