import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/Sheet";
import { DemoSection } from "./DemoSection";
import { StateCell } from "./StateCell";
import { SAMPLE_CLIENT, SAMPLE_PHONE } from "./sample-data";

function ClientSheet({ side, triggerLabel }: { side: "right" | "bottom"; triggerLabel: string }) {
  const { t } = useTranslation();

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button className="self-start">{triggerLabel}</Button>
      </SheetTrigger>
      <SheetContent side={side}>
        <SheetHeader>
          <SheetTitle>{SAMPLE_CLIENT}</SheetTitle>
          <SheetDescription>{t("dev.sheet.description")}</SheetDescription>
        </SheetHeader>
        <dl className="divide-y divide-border rounded-lg border border-border text-sm">
          <div className="flex min-h-12 items-center justify-between gap-4 px-4">
            <dt className="text-muted">{t("dev.sheet.phone")}</dt>
            <dd className="tabular">{SAMPLE_PHONE}</dd>
          </div>
          <div className="flex min-h-12 items-center justify-between gap-4 px-4">
            <dt className="text-muted">{t("dev.sheet.projects")}</dt>
            <dd className="tabular">2</dd>
          </div>
        </dl>
        <SheetFooter className="mt-auto">
          <SheetClose asChild>
            <Button>{t("dev.actions.close")}</Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export function SheetDemo() {
  const { t } = useTranslation();

  return (
    <DemoSection id="sheet" title={t("dev.sections.sheet")}>
      <StateCell label={t("dev.states.tryIt")}>
        <ClientSheet side="right" triggerLabel={t("dev.sheet.openRight")} />
      </StateCell>
      <StateCell label={t("dev.states.tryIt")}>
        <ClientSheet side="bottom" triggerLabel={t("dev.sheet.openBottom")} />
      </StateCell>
    </DemoSection>
  );
}
