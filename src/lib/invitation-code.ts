/**
 * Invitation codes are 8 letters/digits, shown as XXXX-XXXX (e.g. KX7P-M4Q2).
 * The same code is the last part of an invitation link: https://…/invite/KX7P-M4Q2.
 * Whether a code is real is for the server to say; this only reads the input.
 */

const LINK_SEGMENT = /\/invite\/([^/?#\s]+)/i;

/** Turns a pasted link or a typed code into "XXXX-XXXX", or null if it cannot be one. */
export function parseInvitationInput(input: string): string | null {
  const trimmed = input.trim();
  const fromLink = LINK_SEGMENT.exec(trimmed)?.[1];
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
