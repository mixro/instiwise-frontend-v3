import type { Language } from "@/i18n/languages";

/**
 * The emails the mock backend "sent" (ADR 0006). There is no real email in the
 * demo, so the Mailbox panel (demo mode only) lists these with their links.
 * Only demo code imports this file, so real builds never contain it.
 */
export interface MockMail {
  id: string;
  to: string;
  kind: "VERIFY" | "CHANGE" | "RESET";
  /** The account's saved language: the real email is written in it. */
  language: Language;
  /** A path in this app: /verify-email/<token> or /reset-password/<token>. */
  path: string;
  sentAt: string;
}

let mails: MockMail[] = [];
const listeners = new Set<() => void>();

const notify = () => listeners.forEach((listener) => listener());

/** Newest first. A new array after every change, for useSyncExternalStore. */
export const sentMails = (): readonly MockMail[] => mails;

export function subscribeMailbox(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function deliver(mail: Omit<MockMail, "id">): void {
  mails = [{ ...mail, id: `mail_${mails.length + 1}` }, ...mails];
  notify();
}

export function resetMailbox(seed: MockMail[] = []): void {
  mails = seed;
  notify();
}
