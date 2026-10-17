import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface DemoSectionProps {
  id: string;
  title: string;
  /** Overrides the grid columns, e.g. "lg:grid-cols-5". */
  className?: string;
  children: ReactNode;
}

export function DemoSection({ id, title, className, children }: DemoSectionProps) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-heading`}
      className="scroll-mt-8 space-y-4 border-t border-border pt-8"
    >
      <h2 id={`${id}-heading`} className="text-lg font-semibold">
        {title}
      </h2>
      <div className={cn("grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3", className)}>
        {children}
      </div>
    </section>
  );
}
