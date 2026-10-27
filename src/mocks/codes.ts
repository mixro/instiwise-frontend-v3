/** 8 characters without look-alikes (0/O, 1/I), shown as XXXX-XXXX. */
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/**
 * A new invitation or reset code (both have the same format, ADR 0005), never
 * one that `taken` says is in use already.
 */
export function newShortCode(taken: (code: string) => boolean): string {
  for (;;) {
    const bytes = crypto.getRandomValues(new Uint8Array(8));
    const raw = Array.from(bytes, (byte) => ALPHABET[byte % ALPHABET.length]).join("");
    const code = `${raw.slice(0, 4)}-${raw.slice(4)}`;
    if (!taken(code)) return code;
  }
}
