import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";
import { fieldStyles } from "./field-styles";

export function Textarea({ className, rows = 4, ...props }: ComponentProps<"textarea">) {
  return (
    <textarea
      rows={rows}
      className={cn(fieldStyles, "min-h-24 resize-y py-2 leading-6", className)}
      {...props}
    />
  );
}
