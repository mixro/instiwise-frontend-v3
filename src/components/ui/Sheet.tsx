import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";
import { DialogCloseButton, DialogOverlay } from "./Dialog";

export const Sheet = DialogPrimitive.Root;
export const SheetTrigger = DialogPrimitive.Trigger;
export const SheetClose = DialogPrimitive.Close;
export {
  DialogDescription as SheetDescription,
  DialogFooter as SheetFooter,
  DialogHeader as SheetHeader,
  DialogTitle as SheetTitle,
} from "./Dialog";

const sides = cva(
  "fixed z-50 flex flex-col gap-6 overflow-y-auto border-border bg-surface p-6 text-foreground focus:outline-none",
  {
    variants: {
      side: {
        right: "inset-y-0 right-0 h-full w-full border-l sm:max-w-md",
        left: "inset-y-0 left-0 h-full w-full border-r sm:max-w-md",
        // Phones: slides up from the bottom, clear of the home indicator.
        bottom:
          "inset-x-0 bottom-0 max-h-[85dvh] rounded-t-xl border-t pb-[max(1.5rem,env(safe-area-inset-bottom))]",
      },
    },
    defaultVariants: { side: "right" },
  },
);

type SheetContentProps = ComponentProps<typeof DialogPrimitive.Content> &
  VariantProps<typeof sides>;

/** A dialog attached to a screen edge. Include a SheetTitle and a SheetDescription. */
export function SheetContent({ side, className, children, ...props }: SheetContentProps) {
  return (
    <DialogPrimitive.Portal>
      <DialogOverlay />
      <DialogPrimitive.Content className={cn(sides({ side }), className)} {...props}>
        {children}
        <DialogCloseButton />
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}
