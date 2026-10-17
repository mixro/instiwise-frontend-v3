import { Construction } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import type { NavLabelKey } from "./navigation";

/** Stand-in for a screen that arrives in phase 2. Titled after its nav item. */
export function PlaceholderPage({ label, children }: { label: NavLabelKey; children?: ReactNode }) {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <PageHeader title={t(label)} />
      <EmptyState
        icon={Construction}
        title={t("shell.placeholder.title")}
        description={t("shell.placeholder.body")}
      />
      {children}
    </div>
  );
}
