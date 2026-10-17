import { useTranslation } from "react-i18next";
import { Skeleton } from "@/components/ui/Skeleton";
import { DemoSection } from "./DemoSection";
import { StateCell } from "./StateCell";

export function SkeletonDemo() {
  const { t } = useTranslation();

  return (
    <DemoSection id="skeleton" title={t("dev.sections.skeleton")}>
      <StateCell label={t("dev.skeleton.card")}>
        <div
          aria-busy="true"
          className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-4"
        >
          <div className="flex items-center gap-4">
            <Skeleton className="size-10 rounded-full" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          </div>
          <Skeleton className="h-8 w-full" />
        </div>
      </StateCell>
      <StateCell label={t("dev.skeleton.rows")}>
        <div aria-busy="true" className="flex flex-col gap-2">
          <Skeleton className="h-12 w-full rounded-lg" />
          <Skeleton className="h-12 w-full rounded-lg" />
          <Skeleton className="h-12 w-full rounded-lg" />
        </div>
      </StateCell>
    </DemoSection>
  );
}
