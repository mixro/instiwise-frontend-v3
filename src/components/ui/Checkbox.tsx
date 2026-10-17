import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { Check } from "lucide-react";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

export function Checkbox({ className, ...props }: ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      className={cn(
        "peer relative inline-flex size-5 shrink-0 items-center justify-center rounded border border-input bg-surface text-brand-fg transition-colors",
        // The box is 20 px; the invisible ::after makes the touch target 44 px.
        "after:absolute after:-inset-3",
        "hover:border-muted disabled:cursor-not-allowed disabled:opacity-50",
        "data-[state=checked]:border-brand-text data-[state=checked]:bg-brand data-[state=checked]:hover:bg-brand-hover",
        "aria-invalid:border-danger-fg",
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator>
        <Check className="size-4" strokeWidth={3} aria-hidden="true" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}
