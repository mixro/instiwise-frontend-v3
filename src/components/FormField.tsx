import { CircleAlert } from "lucide-react";
import { useId, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Label } from "@/components/ui/Label";
import { cn } from "@/lib/cn";

/** Spread these onto the control so the label, hint and error are announced with it. */
export interface FieldControlProps {
  id: string;
  "aria-describedby"?: string;
  "aria-invalid"?: true;
}

interface FormFieldProps {
  label: string;
  /** Format or example, shown between label and control. */
  hint?: string;
  /** Translated error (from error.code or validation). Marks the control invalid. */
  error?: string;
  /** Adds "(optional)" to the label. Fields are required unless marked. */
  optional?: boolean;
  className?: string;
  children: (control: FieldControlProps) => ReactNode;
}

/**
 * Label, hint, control and error, wired together:
 * <FormField label={t("…")} error={…}>{(control) => <Input {...control} />}</FormField>
 */
export function FormField({ label, hint, error, optional, className, children }: FormFieldProps) {
  const { t } = useTranslation();
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint && hintId, error && errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <Label htmlFor={id}>
        {label}
        {optional && <span className="font-normal text-muted"> {t("ui.optional")}</span>}
      </Label>
      {hint && (
        <p id={hintId} className="-mt-1 text-sm text-muted">
          {hint}
        </p>
      )}
      {children({ id, "aria-describedby": describedBy, "aria-invalid": error ? true : undefined })}
      {error && (
        <p id={errorId} className="flex items-start gap-2 text-sm text-danger-fg">
          <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  );
}
