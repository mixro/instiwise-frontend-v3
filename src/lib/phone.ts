/**
 * Tanzanian phone numbers: 0 or +255 (or 255) followed by 9 digits, the first not 0.
 * Spaces, dashes and brackets are ignored. Stored as +255XXXXXXXXX, which is also
 * what the WhatsApp click-to-chat link needs.
 */
export function normalizeTzPhone(input: string): string | null {
  const compact = input.replace(/[\s\-()]/g, "");
  const match = /^(?:\+?255|0)([1-9]\d{8})$/.exec(compact);
  return match ? `+255${match[1]}` : null;
}

/** "+255754321987" as "+255 754 321 987". Anything else is returned unchanged. */
export function formatTzPhone(phone: string): string {
  const match = /^\+255(\d{3})(\d{3})(\d{3})$/.exec(phone);
  return match ? `+255 ${match[1]} ${match[2]} ${match[3]}` : phone;
}

/** The WhatsApp click-to-chat link for a +255… number (brief 13.2: a shortcut, not an integration). */
export function whatsAppUrl(phone: string): string {
  return `https://wa.me/${phone.replace(/\D/g, "")}`;
}
