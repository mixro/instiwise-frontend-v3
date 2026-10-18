import markUrl from "@/assets/brand/mark.png";
import { cn } from "@/lib/cn";
import { Wordmark } from "./Wordmark";

/** The icon alone (the supplied PNG, used as is). */
export function Mark({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <img
      src={markUrl}
      alt=""
      width={size}
      height={size}
      className={cn("block shrink-0 select-none", className)}
      draggable={false}
    />
  );
}

/**
 * Icon + wordmark, laid out like the supplied full logo: the wordmark's height
 * is 130/335.67 of the icon's, and the two are vertically centered.
 * `height` is the icon height in px. The lettering follows the text color, so
 * it is dark in light mode and white in dark mode.
 */
export function Logo({ height = 32, className }: { height?: number; className?: string }) {
  return (
    <span className={cn("inline-flex gap-1 items-center text-foreground", className)}>
      <Mark size={height} />
      <Wordmark height={(height * 135) / 235.67} />
    </span>
  );
}
