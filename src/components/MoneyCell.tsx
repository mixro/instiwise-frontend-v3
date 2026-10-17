import { useLanguage } from "@/hooks/useLanguage";
import { cn } from "@/lib/cn";
import { formatTzs } from "@/lib/format";

interface MoneyCellProps {
  /** Whole TZS exactly as the server returned it. Never a total computed in the browser. */
  amount: number;
  className?: string;
}

/** An amount in TZS: right-aligned, tabular figures, never wrapped. Throws on non-integers. */
export function MoneyCell({ amount, className }: MoneyCellProps) {
  const language = useLanguage();
  return (
    <span className={cn("tabular block text-right whitespace-nowrap", className)}>
      {formatTzs(amount, language)}
    </span>
  );
}
