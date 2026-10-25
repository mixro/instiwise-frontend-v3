import { cn } from "@/lib/cn";
import { SERIES, type SeriesKey } from "./series";

interface ChartTooltipProps {
  title: string;
  /** Exact amounts, already formatted with formatTzs. */
  rows: { key: SeriesKey; label: string; value: string }[];
}

/** The exact figures behind a hovered or keyboard-focused bar. */
export function ChartTooltip({ title, rows }: ChartTooltipProps) {
  return (
    <div className="min-w-44 rounded-lg border border-border bg-surface p-3 text-sm shadow-md">
      <p className="mb-2 font-medium">{title}</p>
      <dl className="space-y-1">
        {rows.map((row) => (
          <div key={row.key} className="flex items-center justify-between gap-4">
            <dt className="flex items-center gap-2 text-muted">
              <span
                aria-hidden="true"
                className={cn("size-2.5 shrink-0 rounded-sm", SERIES[row.key].swatch)}
              />
              {row.label}
            </dt>
            <dd className="tabular font-medium">{row.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
