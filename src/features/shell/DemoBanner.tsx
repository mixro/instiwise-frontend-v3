import { Info } from "lucide-react";
import { useTranslation } from "react-i18next";
import { DEMO_MODE } from "@/lib/demo-mode";

/** A thin strip on every layout of the public demo: the data is made up and resets. */
export function DemoBanner() {
  const { t } = useTranslation();
  if (!DEMO_MODE) return null;

  return (
    <div role="note" className="border-b border-border bg-brand-soft text-xs text-brand-text">
      <p className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-1.5">
        <Info className="size-4 shrink-0" aria-hidden="true" />
        <span>
          <span className="font-semibold">{t("demo.banner.title")}</span> {t("demo.banner.body")}
        </span>
      </p>
    </div>
  );
}
