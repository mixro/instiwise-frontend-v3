import { useTranslation } from "react-i18next";
import { Bar, BarChart, CartesianGrid, ReferenceLine, Tooltip, XAxis, YAxis } from "recharts";
import type { FinanceMonth } from "@/features/expenses/api";
import { useLanguage } from "@/hooks/useLanguage";
import { formatMonth, formatMonthShort, formatTzs, formatTzsCompact } from "@/lib/format";
import { ChartTooltip } from "./ChartTooltip";
import { SERIES, type SeriesKey } from "./series";

const AXIS_TICK = { fill: "var(--muted)", fontSize: 12 };

interface TrendChartProps {
  months: FinanceMonth[];
  /** Translated series names: operators' expenses are variable costs only. */
  labels: Record<SeriesKey, string>;
  title: string;
}

/**
 * Collected, expenses and profit side by side for each month, on one axis.
 * Shortened amounts appear only on the axis; the tooltip and table are exact.
 * Recharts' keyboard layer lets the arrow keys move between months.
 */
export function TrendChart({ months, labels, title }: TrendChartProps) {
  const language = useLanguage();
  const { t } = useTranslation();
  const spansYears = new Set(months.map((row) => row.month.slice(0, 4))).size > 1;
  const keys: SeriesKey[] = ["collected", "expenses", "profit"];
  const data = months.map((row) => ({
    ...row,
    label: formatMonthShort(row.month, language, spansYears),
  }));

  return (
    <BarChart
      data={data}
      responsive
      style={{ width: "100%", height: 280 }}
      margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
      barGap={2}
      barCategoryGap="24%"
      title={title}
      desc={t("analytics.chart.keyboard")}
    >
      <CartesianGrid vertical={false} stroke="var(--border)" />
      <XAxis dataKey="label" tickLine={false} axisLine={false} tick={AXIS_TICK} />
      <YAxis
        width={64}
        tickLine={false}
        axisLine={false}
        tick={AXIS_TICK}
        tickFormatter={(value: number) => formatTzsCompact(value, language)}
      />
      <ReferenceLine y={0} stroke="var(--border-strong)" />
      <Tooltip
        cursor={{ fill: "var(--surface-muted)" }}
        content={({ active, payload }) => {
          const row = active ? (payload?.[0]?.payload as (typeof data)[number] | undefined) : null;
          if (!row) return null;
          return (
            <ChartTooltip
              title={formatMonth(row.month, language)}
              rows={keys.map((key) => ({
                key,
                label: labels[key],
                value: formatTzs(row[key], language),
              }))}
            />
          );
        }}
      />
      {keys.map((key) => (
        <Bar
          key={key}
          dataKey={key}
          name={labels[key]}
          fill={SERIES[key].fill}
          radius={[4, 4, 0, 0]}
          maxBarSize={28}
          isAnimationActive={false}
        />
      ))}
    </BarChart>
  );
}
