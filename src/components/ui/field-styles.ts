/**
 * Shared look of text-like controls (Input, Textarea, SelectTrigger).
 * Error state comes from aria-invalid, so the visual and the accessible state never disagree.
 * 16 px text on phones stops iOS from zooming into the field.
 */
export const fieldStyles =
  "w-full rounded-lg border border-input bg-surface px-4 text-base text-foreground transition-colors placeholder:text-muted hover:border-muted disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-input aria-invalid:border-danger-fg aria-invalid:hover:border-danger-fg sm:text-sm";

/** Height of single-line controls: 48 px on phones, 40 px from the sm breakpoint. */
export const fieldHeight = "h-12 sm:h-10";
