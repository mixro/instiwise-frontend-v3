import { useState } from "react";
import { useTranslation } from "react-i18next";
import { FormAlert } from "@/components/FormAlert";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { useErrorText } from "@/hooks/useErrorText";
import { useToast } from "@/hooks/useToast";
import { adminApi } from "./api";
import { useRefreshAll } from "./queries";

export interface AssignOption {
  id: string;
  label: string;
  /** Shown after the label, e.g. "now with Zawadi Mollel". */
  note?: string;
}

interface AssignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  /** What to choose: an operator for a client, or a client for an operator. */
  fieldLabel: string;
  options: AssignOption[];
  /** Turns the chosen option into (clientId, operatorId). */
  pair: (chosenId: string) => [clientId: string, operatorId: string];
  successMessage: (chosen: AssignOption) => string;
}

/** Assigns a client to an active operator (per client, ADR 0002). */
export function AssignDialog({
  open,
  onOpenChange,
  title,
  description,
  fieldLabel,
  options,
  pair,
  successMessage,
}: AssignDialogProps) {
  const { t } = useTranslation();
  const { apiError } = useErrorText();
  const { toast } = useToast();
  const refresh = useRefreshAll();
  const [chosen, setChosen] = useState("");
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);

  function close(next: boolean) {
    if (saving) return;
    if (!next) {
      setChosen("");
      setError(undefined);
    }
    onOpenChange(next);
  }

  async function save() {
    const option = options.find((o) => o.id === chosen);
    if (!option) {
      setError(t("validation.assignRequired"));
      return;
    }
    setSaving(true);
    setError(undefined);
    try {
      const [clientId, operatorId] = pair(option.id);
      await adminApi.assignClient(clientId, operatorId);
      toast({ variant: "success", title: successMessage(option) });
      void refresh();
      setSaving(false);
      close(false);
    } catch (failure) {
      setSaving(false);
      setError(apiError(failure));
    }
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {options.length === 0 ? (
          <p className="text-sm text-muted">{t("admin.assign.noOptions")}</p>
        ) : (
          <FormField label={fieldLabel}>
            {({ id, ...aria }) => (
              <Select value={chosen} onValueChange={setChosen}>
                <SelectTrigger id={id} {...aria}>
                  <SelectValue placeholder={t("admin.assign.choose")} />
                </SelectTrigger>
                <SelectContent>
                  {options.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.note ? `${option.label} (${option.note})` : option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </FormField>
        )}
        {error && <FormAlert>{error}</FormAlert>}
        <DialogFooter>
          <DialogClose asChild>
            <Button disabled={saving}>{t("ui.cancel")}</Button>
          </DialogClose>
          <Button
            variant="primary"
            loading={saving}
            disabled={options.length === 0}
            onClick={() => void save()}
          >
            {t("admin.assign.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
