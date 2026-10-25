import { Suspense, useId, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";

interface ChartPanelProps {
  title: string;
  description: string;
  /** Shown above the chart (a legend when there is more than one series). */
  legend?: ReactNode;
  chart: ReactNode;
  /** The same figures as a table: the chart's text alternative. */
  table: ReactNode;
}

/** A titled chart with a switch to read the same figures as a table. */
export function ChartPanel({ title, description, legend, chart, table }: ChartPanelProps) {
  const { t } = useTranslation();
  const titleId = useId();
  const [asTable, setAsTable] = useState(false);

  return (
    <section
      aria-labelledby={titleId}
      className="min-w-0 space-y-3 rounded-lg border border-border bg-surface p-4"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 id={titleId} className="font-semibold">
            {title}
          </h3>
          <p className="text-sm text-muted">{description}</p>
        </div>
        <Button size="sm" aria-pressed={asTable} onClick={() => setAsTable((value) => !value)}>
          {t("analytics.chart.showTable")}
        </Button>
      </div>
      {asTable ? (
        table
      ) : (
        <>
          {legend}
          <Suspense fallback={<Skeleton className="h-64 w-full" />}>{chart}</Suspense>
          <p className="text-xs text-muted">{t("analytics.chart.keyboard")}</p>
        </>
      )}
    </section>
  );
}
