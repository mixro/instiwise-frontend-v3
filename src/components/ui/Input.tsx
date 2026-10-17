import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";
import { fieldHeight, fieldStyles } from "./field-styles";

/** Set aria-invalid and aria-describedby (pointing at the error text) to show an error. */
export function Input({ className, type = "text", ...props }: ComponentProps<"input">) {
  return <input type={type} className={cn(fieldStyles, fieldHeight, className)} {...props} />;
}
