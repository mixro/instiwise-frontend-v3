import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/hooks/useToast";
import { DemoSection } from "./DemoSection";
import { StateCell } from "./StateCell";
import { DEMO_DELAY_MS, SAMPLE_RECEIPT } from "./sample-data";

function wait(): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, DEMO_DELAY_MS));
}

function RevokeDemo() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="danger" className="self-start" onClick={() => setOpen(true)}>
        {t("dev.confirm.revokeOpen")}
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        tone="danger"
        title={t("dev.confirm.revokeTitle", { name: "Rehema Said" })}
        description={t("dev.confirm.revokeBody")}
        confirmLabel={t("dev.confirm.revokeOpen")}
        onConfirm={async () => {
          await wait();
          toast({ variant: "success", title: t("dev.confirm.revoked") });
        }}
      />
    </>
  );
}

function ReverseDemo({ fails }: { fails?: boolean }) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string>();

  return (
    <>
      <Button className="self-start" onClick={() => setOpen(true)}>
        {fails ? t("dev.confirm.failOpen") : t("dev.confirm.reverseOpen")}
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setError(undefined);
        }}
        tone="danger"
        title={t("dev.confirm.reverseTitle", { number: SAMPLE_RECEIPT })}
        description={t("dev.confirm.reverseBody")}
        confirmLabel={t("dev.confirm.reverseOpen")}
        reason={{ label: t("dev.confirm.reasonLabel"), hint: t("dev.confirm.reasonHint") }}
        error={error}
        onConfirm={async () => {
          setError(undefined);
          await wait();
          if (fails) {
            setError(t("dev.confirm.failError"));
            throw new Error("demo failure");
          }
          toast({ variant: "success", title: t("dev.confirm.reversed") });
        }}
      />
    </>
  );
}

export function ConfirmDialogDemo() {
  const { t } = useTranslation();

  return (
    <DemoSection id="confirmDialog" title={t("dev.sections.confirmDialog")}>
      <StateCell label={`${t("dev.states.tryIt")} · ${t("dev.confirm.danger")}`}>
        <RevokeDemo />
      </StateCell>
      <StateCell label={`${t("dev.states.tryIt")} · ${t("dev.confirm.withReason")}`}>
        <ReverseDemo />
      </StateCell>
      <StateCell label={t("dev.states.error")}>
        <ReverseDemo fails />
      </StateCell>
    </DemoSection>
  );
}
