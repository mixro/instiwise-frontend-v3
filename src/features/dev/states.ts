/** States every form control is shown in on /dev/components. */
export const FIELD_STATES = ["default", "hover", "focus", "disabled", "error", "loading"] as const;

export type FieldState = (typeof FIELD_STATES)[number];

/**
 * Forces the hover or focus look without a pointer or keyboard.
 * Matches the custom hover and focus-visible variants in styles/index.css.
 */
export function preview(state: string): { "data-preview"?: "hover" | "focus" } {
  return state === "hover" || state === "focus" ? { "data-preview": state } : {};
}
