import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/Dialog";
import { useToast } from "@/hooks/useToast";
import { currentLanguage } from "@/i18n";
import { formatTzs } from "@/lib/format";
import { DemoSection } from "./DemoSection";
import { StateCell } from "./StateCell";
import { DEMO_DELAY_MS, SAMPLE_AMOUNT, SAMPLE_CLIENT, SAMPLE_RECEIPT } from "./sample-data";

function PaymentDialog({ triggerLabel, failSave }: { triggerLabel: string; failSave?: boolean }) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setSaving(false);
      setFailed(false);
    }
  }

  function save() {
    setSaving(true);
    setFailed(false);
    window.setTimeout(() => {
      setSaving(false);
      if (failSave) {
        setFailed(true);
        return;
      }
      setOpen(false);
      toast({
        variant: "success",
        title: t("dev.toast.successTitle"),
        description: t("dev.toast.successBody", { number: SAMPLE_RECEIPT }),
      });
    }, DEMO_DELAY_MS);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant={failSave ? "secondary" : "primary"} className="self-start">
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {t("dev.dialog.title", { amount: formatTzs(SAMPLE_AMOUNT, currentLanguage()) })}
          </DialogTitle>
          <DialogDescription>
            {t("dev.dialog.description", { client: SAMPLE_CLIENT })}
          </DialogDescription>
        </DialogHeader>
        {failed && (
          <p role="alert" className="rounded-lg bg-danger-bg px-4 py-2 text-sm text-danger-fg">
            {t("dev.dialog.saveError")}
          </p>
        )}
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary">{t("dev.actions.cancel")}</Button>
          </DialogClose>
          <Button variant="primary" loading={saving} onClick={save}>
            {saving ? t("dev.actions.saving") : t("dev.actions.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function DialogDemo() {
  const { t } = useTranslation();

  return (
    <DemoSection id="dialog" title={t("dev.sections.dialog")}>
      <StateCell label={`${t("dev.states.tryIt")} · ${t("dev.states.loading")}`}>
        <PaymentDialog triggerLabel={t("dev.dialog.open")} />
      </StateCell>
      <StateCell label={t("dev.states.error")}>
        <PaymentDialog triggerLabel={t("dev.dialog.openFailing")} failSave />
      </StateCell>
    </DemoSection>
  );
}
