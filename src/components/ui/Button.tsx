import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

const variants = cva(
  "inline-flex items-center justify-center gap-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "bg-brand text-brand-fg hover:bg-brand-hover",
        secondary: "border border-border-strong bg-surface text-foreground hover:bg-surface-muted",
        ghost: "text-foreground hover:bg-surface-muted",
        // Destructive confirmations (revoke, reverse). Text uses --surface so it inverts with the theme.
        danger: "bg-danger-fg text-surface hover:bg-danger-fg/90",
      },
      size: {
        sm: "h-8 px-3",
        // 48 px on phones (touch target), 40 px from the sm breakpoint.
        md: "h-12 px-4 sm:h-10",
        icon: "size-12 sm:size-10",
      },
    },
    defaultVariants: { variant: "secondary", size: "md" },
  },
);

type ButtonProps = ComponentProps<"button"> &
  VariantProps<typeof variants> & {
    /** Shows a spinner and blocks clicks while an action runs. Keep the label, e.g. "Saving…". */
    loading?: boolean;
    /** Styles the single child instead (e.g. a router Link) as a button. */
    asChild?: boolean;
  };

export function Button({
  className,
  variant,
  size,
  type = "button",
  loading = false,
  asChild = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  if (asChild) {
    return (
      <Slot className={cn(variants({ variant, size }), className)} {...props}>
        {children}
      </Slot>
    );
  }

  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(variants({ variant, size }), className)}
      {...props}
    >
      {loading && (
        <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
      )}
      {children}
    </button>
  );
}
