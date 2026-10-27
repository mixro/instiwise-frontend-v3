/**
 * Invitation codes are 8 letters/digits, shown as XXXX-XXXX (e.g. KX7P-M4Q2).
 * The same code is the last part of an invitation link: https://…/invite/KX7P-M4Q2.
 * Password reset codes have the same format and their own link, /reset/<code>
 * (ADR 0005). Whether a code is real is for the server to say; this only reads the input.
 */

/** Turns a pasted link (with `/segment/<code>` in it) or a typed code into "XXXX-XXXX", or null. */
function parseCodeInput(input: string, segment: "invite" | "reset"): string | null {
  const trimmed = input.trim();
  const fromLink = new RegExp(`/${segment}/([^/?#\\s]+)`, "i").exec(trimmed)?.[1];
  let raw: string;
  try {
    raw = fromLink ? decodeURIComponent(fromLink) : trimmed;
  } catch {
    return null;
  }
  const compact = raw.toUpperCase().replace(/[\s-]/g, "");
  if (!/^[A-Z0-9]{8}$/.test(compact)) return null;
  return `${compact.slice(0, 4)}-${compact.slice(4)}`;
}

/** An invitation link or code as "XXXX-XXXX", or null if it cannot be one. */
export const parseInvitationInput = (input: string) => parseCodeInput(input, "invite");

/** A password reset link or code as "XXXX-XXXX", or null if it cannot be one. */
export const parseResetCodeInput = (input: string) => parseCodeInput(input, "reset");
