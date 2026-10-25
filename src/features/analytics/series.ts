/**
 * One colour per measure, the same in every chart and legend (tokens.css,
 * --chart-*). Text never takes these colours; a swatch beside it does.
 */
export const SERIES = {
  collected: { fill: "var(--chart-collected)", swatch: "bg-chart-collected" },
  expenses: { fill: "var(--chart-expenses)", swatch: "bg-chart-expenses" },
  profit: { fill: "var(--chart-profit)", swatch: "bg-chart-profit" },
} as const;

export type SeriesKey = keyof typeof SERIES;
