import { cn } from "@/lib/cn";
import { SERIES, type SeriesKey } from "./series";

/** Names every series in words beside its colour, so nothing is told by colour alone. */
export function ChartLegend({ items }: { items: { key: SeriesKey; label: string }[] }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
      {items.map((item) => (
        <li key={item.key} className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className={cn("size-3 shrink-0 rounded-sm", SERIES[item.key].swatch)}
          />
          {item.label}
        </li>
      ))}
    </ul>
  );
}
