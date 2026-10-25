import { z } from "zod";
import type { Language } from "@/i18n/languages";
import type { Schema } from "./contract/types";

/**
 * An agreement term in English and Swahili, both written by staff (ADR 0004;
 * decided 2026-10-25). Readers see the copy in their own language.
 */
export type Term = Schema<"BilingualText">;

export const TERM_MAX_LENGTH = 300;

export const termText = (term: Term, language: Language): string => term[language];

/** A stable key for lists: the same term means both copies match. */
export const termKey = (term: Term): string => `${term.en}\u0000${term.sw}`;

/** Rows in a form; fully empty rows are allowed while typing and dropped on save. */
export const termRow = z.object({
  en: z.string().max(TERM_MAX_LENGTH, "validation.tooLong"),
  sw: z.string().max(TERM_MAX_LENGTH, "validation.tooLong"),
});

/**
 * A list of terms. Every row that is started needs both languages; a required
 * list needs at least one complete term. Messages are translation keys.
 */
export function termsField({ required }: { required?: string } = {}) {
  return z.array(termRow).superRefine((rows, context) => {
    let complete = 0;
    rows.forEach((row, index) => {
      const en = row.en.trim();
      const sw = row.sw.trim();
      if (en && sw) complete += 1;
      else if (en || sw) {
        context.addIssue({
          code: "custom",
          message: "validation.termBothLanguages",
          path: [index, en ? "sw" : "en"],
        });
      }
    });
    if (required && complete === 0) {
      context.addIssue({ code: "custom", message: required, path: [] });
    }
  });
}

/** What the form holds, as the contract expects it: trimmed, empty rows dropped. */
export function cleanTerms(rows: Term[]): Term[] {
  return rows
    .map((row) => ({ en: row.en.trim(), sw: row.sw.trim() }))
    .filter((row) => row.en && row.sw);
}
