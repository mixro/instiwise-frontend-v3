import type { ReactNode } from "react";
import { FormField, type FieldControlProps } from "@/components/FormField";
import { Skeleton } from "@/components/ui/Skeleton";
import { fieldHeight } from "@/components/ui/field-styles";
import { cn } from "@/lib/cn";
import { preview, type FieldState } from "./states";

export interface DemoControlProps extends FieldControlProps {
  disabled?: boolean;
  "data-preview"?: "hover" | "focus";
}

interface DemoFieldProps {
  label: string;
  error: string;
  state: FieldState;
  /** Shape shown while loading; defaults to a single-line control. */
  skeletonClassName?: string;
  /** Renders the control with the props for this state. */
  children: (control: DemoControlProps) => ReactNode;
}

/** A FormField forced into one of the demo states. */
export function DemoField({ label, error, state, skeletonClassName, children }: DemoFieldProps) {
  if (state === "loading") {
    return (
      <div className="flex flex-col gap-2" aria-busy="true">
        <span className="text-sm leading-5 font-medium">{label}</span>
        <Skeleton className={cn("rounded-lg", skeletonClassName ?? fieldHeight)} />
      </div>
    );
  }

  return (
    <FormField label={label} error={state === "error" ? error : undefined}>
      {(control) =>
        children({ ...control, disabled: state === "disabled" || undefined, ...preview(state) })
      }
    </FormField>
  );
}
