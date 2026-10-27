import { CircleAlert, CircleCheck } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * Whether an email address is confirmed (ADR 0006): a tick or a warning sign
 * with the words, never colour alone. `label` is already translated.
 */
export function VerifiedTag({ verified, label }: { verified: boolean; label: string }) {
  const Icon = verified ? CircleCheck : CircleAlert;
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium",
        verified ? "bg-brand-soft text-brand-text" : "bg-warning-bg text-warning-fg",
      )}
    >
      <Icon className="size-3.5 shrink-0" aria-hidden="true" />
      {label}
    </span>
  );
}
