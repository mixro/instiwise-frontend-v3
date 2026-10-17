import * as TabsPrimitive from "@radix-ui/react-tabs";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

export const Tabs = TabsPrimitive.Root;

/** Scrolls sideways when the tabs do not fit (Swahili labels are longer). */
export function TabsList({ className, ...props }: ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      className={cn("flex gap-2 overflow-x-auto border-b border-border", className)}
      {...props}
    />
  );
}

export function TabsTrigger({ className, ...props }: ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        "relative inline-flex h-12 shrink-0 items-center rounded-t-md px-2 text-sm font-medium whitespace-nowrap text-muted transition-colors sm:h-10",
        "hover:text-foreground focus-visible:outline-offset-[-2px] disabled:pointer-events-none disabled:opacity-50",
        // relative: hidden screen-reader text in a badge stays inside the scrolling list
        // instead of widening the page. The inset shadow draws the active underline inside
        // the trigger, so the list never clips it.
        "data-[state=active]:text-foreground data-[state=active]:shadow-[inset_0_-2px_0_var(--brand-text)]",
        className,
      )}
      {...props}
    />
  );
}

export function TabsContent({ className, ...props }: ComponentProps<typeof TabsPrimitive.Content>) {
  return <TabsPrimitive.Content className={cn("pt-4", className)} {...props} />;
}
