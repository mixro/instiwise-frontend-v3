import type { ReactNode } from "react";

interface StatTileProps {
  label: string;
  value: ReactNode;
  /** How the figure is computed and over what period (brief 15.3: precise labels). */
  rule: string;
  /** A link under the rule, e.g. to the records behind the figure. */
  action?: ReactNode;
}

/** One dashboard figure with the rule it follows written underneath. */
export function StatTile({ label, value, rule, action }: StatTileProps) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-border bg-surface p-4">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="tabular text-2xl font-semibold tracking-tight">{value}</dd>
      <dd className="text-xs text-muted">{rule}</dd>
      {action && <dd className="pt-1 text-sm">{action}</dd>}
    </div>
  );
}
