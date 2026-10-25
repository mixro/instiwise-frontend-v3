import { useTranslation } from "react-i18next";
import { Bar, BarChart, CartesianGrid, LabelList, Tooltip, XAxis, YAxis } from "recharts";
import type { CategoryTotal } from "@/features/expenses/api";
import { useLanguage } from "@/hooks/useLanguage";
import { formatTzs, formatTzsCompact } from "@/lib/format";
import { ChartTooltip } from "./ChartTooltip";
import { SERIES } from "./series";

const AXIS_TICK = { fill: "var(--muted)", fontSize: 12 };
const ROW_HEIGHT = 40;

interface CategoryChartProps {
  categories: CategoryTotal[];
  /** Names the one series (the chart title says what it is). */
  label: string;
  title: string;
}

/** Approved expenses per category, largest first as the server sends them, one bar each. */
export function CategoryChart({ categories, label, title }: CategoryChartProps) {
  const language = useLanguage();
  const { t } = useTranslation();

  return (
    <BarChart
      data={categories}
      layout="vertical"
      responsive
      style={{ width: "100%", height: categories.length * ROW_HEIGHT + 32 }}
      margin={{ top: 0, right: 56, bottom: 0, left: 0 }}
      title={title}
      desc={t("analytics.chart.keyboard")}
    >
      <CartesianGrid horizontal={false} stroke="var(--border)" />
      <XAxis
        type="number"
        tickLine={false}
        axisLine={false}
        tick={AXIS_TICK}
        tickFormatter={(value: number) => formatTzsCompact(value, language)}
      />
      <YAxis
        type="category"
        dataKey="name"
        width={104}
        tickLine={false}
        axisLine={false}
        tick={{ ...AXIS_TICK, fill: "var(--foreground)" }}
      />
      <Tooltip
        cursor={{ fill: "var(--surface-muted)" }}
        content={({ active, payload }) => {
          const row = active ? (payload?.[0]?.payload as CategoryTotal | undefined) : null;
          if (!row) return null;
          return (
            <ChartTooltip
              title={row.name}
              rows={[{ key: "expenses", label, value: formatTzs(row.amount, language) }]}
            />
          );
        }}
      />
      <Bar
        dataKey="amount"
        name={label}
        fill={SERIES.expenses.fill}
        radius={[0, 4, 4, 0]}
        maxBarSize={24}
        isAnimationActive={false}
      >
        <LabelList
          dataKey="amount"
          position="right"
          fill="var(--foreground)"
          fontSize={12}
          formatter={(value) => formatTzsCompact(Number(value), language)}
        />
      </Bar>
    </BarChart>
  );
}
