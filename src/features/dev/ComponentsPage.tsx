import { useTranslation } from "react-i18next";
import { LanguageToggle } from "@/components/LanguageToggle";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Logo } from "@/components/brand/Logo";
import { ButtonDemo } from "./ButtonDemo";
import { CheckboxDemo } from "./CheckboxDemo";
import { ConfirmDialogDemo } from "./ConfirmDialogDemo";
import { DataTableDemo } from "./DataTableDemo";
import { DialogDemo } from "./DialogDemo";
import { EmptyStateDemo } from "./EmptyStateDemo";
import { FormFieldDemo } from "./FormFieldDemo";
import { InputDemo } from "./InputDemo";
import { LabelDemo } from "./LabelDemo";
import { MoneyCellDemo } from "./MoneyCellDemo";
import { PageHeaderDemo } from "./PageHeaderDemo";
import { SelectDemo } from "./SelectDemo";
import { SheetDemo } from "./SheetDemo";
import { SkeletonDemo } from "./SkeletonDemo";
import { StatusBadgeDemo } from "./StatusBadgeDemo";
import { TableDemo } from "./TableDemo";
import { TabsDemo } from "./TabsDemo";
import { TextareaDemo } from "./TextareaDemo";
import { TimelineDemo } from "./TimelineDemo";
import { ToastDemo } from "./ToastDemo";
import { TooltipDemo } from "./TooltipDemo";

const GROUPS = {
  base: [
    "button",
    "input",
    "textarea",
    "select",
    "checkbox",
    "label",
    "tabs",
    "table",
    "dialog",
    "sheet",
    "toast",
    "tooltip",
    "skeleton",
  ],
  shared: [
    "statusBadge",
    "moneyCell",
    "emptyState",
    "confirmDialog",
    "pageHeader",
    "timeline",
    "dataTable",
    "formField",
  ],
} as const;

/** /dev/components: every base component in every state. Development builds only. */
export function ComponentsPage() {
  const { t } = useTranslation();

  return (
    <div className="min-h-dvh">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <Logo height={32} />
          <div className="ml-auto flex items-center gap-2">
            <LanguageToggle />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-8 px-4 py-8">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">{t("dev.title")}</h1>
          <p className="max-w-2xl text-muted">{t("dev.subtitle")}</p>
        </div>

        <nav aria-label={t("dev.contents")} className="space-y-4">
          {(Object.keys(GROUPS) as (keyof typeof GROUPS)[]).map((group) => (
            <div key={group} className="space-y-2">
              <p className="text-xs font-medium tracking-wide text-muted uppercase">
                {t(`dev.groups.${group}`)}
              </p>
              <ul className="flex flex-wrap gap-2">
                {GROUPS[group].map((id) => (
                  <li key={id}>
                    <a
                      href={`#${id}`}
                      className="inline-flex h-12 items-center rounded-md border border-border-strong bg-surface px-3 text-sm hover:bg-surface-muted sm:h-8"
                    >
                      {t(`dev.sections.${id}`)}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <ButtonDemo />
        <InputDemo />
        <TextareaDemo />
        <SelectDemo />
        <CheckboxDemo />
        <LabelDemo />
        <TabsDemo />
        <TableDemo />
        <DialogDemo />
        <SheetDemo />
        <ToastDemo />
        <TooltipDemo />
        <SkeletonDemo />

        <StatusBadgeDemo />
        <MoneyCellDemo />
        <EmptyStateDemo />
        <ConfirmDialogDemo />
        <PageHeaderDemo />
        <TimelineDemo />
        <DataTableDemo />
        <FormFieldDemo />
      </main>
    </div>
  );
}
