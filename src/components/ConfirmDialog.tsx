import { useState } from "react";
import { useTranslation } from "react-i18next";
import { FormField } from "@/components/FormField";
import { Button } from "@/components/ui/Button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";
import { Textarea } from "@/components/ui/Textarea";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Already translated. Name the action and the thing: "Revoke the invitation for Rehema Said?" */
  title: string;
  /** What will happen and whether it can be undone. */
  description: string;
  /** The verb on the button: "Revoke invitation", not "OK". */
  confirmLabel: string;
  /** "danger" for revoking, reversing, cancelling. */
  tone?: "default" | "danger";
  /** Asks for a written reason first (sensitive actions are audited with a reason). */
  reason?: { label: string; hint?: string };
  /** Translated error from the last attempt (from error.code). */
  error?: string;
  /**
   * Runs the action. Receives the trimmed reason when one is asked for.
   * Resolve to close the dialog; throw or reject to keep it open (then pass `error`).
   */
  onConfirm: (reason?: string) => void | Promise<void>;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  tone = "default",
  reason,
  error,
  onConfirm,
}: ConfirmDialogProps) {
  const { t } = useTranslation();
  const [pending, setPending] = useState(false);
  const [reasonText, setReasonText] = useState("");
  const trimmedReason = reasonText.trim();

  function handleOpenChange(next: boolean) {
    // Do not close half-way through a request.
    if (pending) return;
    if (!next) setReasonText("");
    onOpenChange(next);
  }

  async function confirm() {
    setPending(true);
    try {
      await onConfirm(reason ? trimmedReason : undefined);
      setReasonText("");
      onOpenChange(false);
    } catch {
      // The caller turns the failure into `error`; the dialog stays open for a retry.
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {reason && (
          <FormField label={reason.label} hint={reason.hint}>
            {(control) => (
              <Textarea
                rows={3}
                value={reasonText}
                onChange={(event) => setReasonText(event.target.value)}
                disabled={pending}
                {...control}
              />
            )}
          </FormField>
        )}

        {error && (
          <p role="alert" className="rounded-lg bg-danger-bg px-4 py-2 text-sm text-danger-fg">
            {error}
          </p>
        )}

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary" disabled={pending}>
              {t("ui.cancel")}
            </Button>
          </DialogClose>
          <Button
            variant={tone === "danger" ? "danger" : "primary"}
            loading={pending}
            disabled={Boolean(reason) && trimmedReason === ""}
            onClick={() => void confirm()}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
