import * as ToastPrimitive from "@radix-ui/react-toast";
import { cva, type VariantProps } from "class-variance-authority";
import { X } from "lucide-react";
import type { ComponentProps } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/cn";
import { Button } from "./Button";

// Styled Radix parts. Screens do not render these directly; they call useToast().

export const ToastProvider = ToastPrimitive.Provider;

/** Top of the screen on phones (bottom navigation lives below), bottom-right from sm. */
export function ToastViewport({
  className,
  ...props
}: ComponentProps<typeof ToastPrimitive.Viewport>) {
  return (
    <ToastPrimitive.Viewport
      className={cn(
        "fixed top-0 right-0 z-[100] flex max-h-dvh w-full flex-col gap-2 p-4 outline-none sm:top-auto sm:bottom-0 sm:max-w-sm",
        className,
      )}
      {...props}
    />
  );
}

const variants = cva(
  "pointer-events-auto relative flex w-full items-start gap-3 rounded-lg border p-4 pr-14 text-sm",
  {
    variants: {
      variant: {
        info: "border-border-strong bg-surface text-foreground",
        success: "border-border-strong bg-surface text-foreground",
        error: "border-danger-fg bg-danger-bg text-danger-fg",
      },
    },
    defaultVariants: { variant: "info" },
  },
);

export function Toast({
  className,
  variant,
  ...props
}: ComponentProps<typeof ToastPrimitive.Root> & VariantProps<typeof variants>) {
  return <ToastPrimitive.Root className={cn(variants({ variant }), className)} {...props} />;
}

export function ToastTitle({ className, ...props }: ComponentProps<typeof ToastPrimitive.Title>) {
  return <ToastPrimitive.Title className={cn("font-medium", className)} {...props} />;
}

export function ToastDescription({
  className,
  ...props
}: ComponentProps<typeof ToastPrimitive.Description>) {
  return <ToastPrimitive.Description className={cn("mt-1", className)} {...props} />;
}

export function ToastClose() {
  const { t } = useTranslation();
  return (
    <ToastPrimitive.Close asChild>
      <Button
        variant="ghost"
        size="icon"
        aria-label={t("ui.close")}
        className="absolute top-1 right-1 text-current"
      >
        <X className="size-4" aria-hidden="true" />
      </Button>
    </ToastPrimitive.Close>
  );
}
