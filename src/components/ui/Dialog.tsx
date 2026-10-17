import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ComponentProps } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/cn";
import { Button } from "./Button";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

export function DialogOverlay({
  className,
  ...props
}: ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      className={cn("fixed inset-0 z-50 bg-overlay", className)}
      {...props}
    />
  );
}

/** The X in the corner of dialogs and sheets. */
export function DialogCloseButton({ className }: { className?: string }) {
  const { t } = useTranslation();
  return (
    <DialogPrimitive.Close asChild>
      <Button
        variant="ghost"
        size="icon"
        aria-label={t("ui.close")}
        className={cn("absolute top-2 right-2", className)}
      >
        <X className="size-4" aria-hidden="true" />
      </Button>
    </DialogPrimitive.Close>
  );
}

/** Always include a DialogTitle and a DialogDescription: screen readers announce both. */
export function DialogContent({
  className,
  children,
  ...props
}: ComponentProps<typeof DialogPrimitive.Content>) {
  return (
    <DialogPrimitive.Portal>
      <DialogOverlay />
      <DialogPrimitive.Content
        className={cn(
          "fixed top-1/2 left-1/2 z-50 grid max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 gap-6 overflow-y-auto rounded-xl border border-border bg-surface p-6 text-foreground focus:outline-none",
          className,
        )}
        {...props}
      >
        {children}
        <DialogCloseButton />
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export function DialogHeader({ className, ...props }: ComponentProps<"div">) {
  // Right padding keeps long (Swahili) titles clear of the close button.
  return <div className={cn("flex flex-col gap-2 pr-10", className)} {...props} />;
}

export function DialogFooter({ className, ...props }: ComponentProps<"div">) {
  // Stacked full-width buttons on phones, primary action on top.
  return (
    <div
      className={cn("flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)}
      {...props}
    />
  );
}

export function DialogTitle({ className, ...props }: ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      className={cn("text-lg leading-6 font-semibold", className)}
      {...props}
    />
  );
}

export function DialogDescription({
  className,
  ...props
}: ComponentProps<typeof DialogPrimitive.Description>) {
  return <DialogPrimitive.Description className={cn("text-sm text-muted", className)} {...props} />;
}
