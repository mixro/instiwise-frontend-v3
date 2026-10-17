import { z } from "zod";
import type { PaymentMethod } from "@/features/client/api";
import { paymentDateRange } from "@/lib/dates";
import { parseTzs } from "@/lib/format";

/*
 * Record-payment rules (decided 2026-10-17); the server checks them again:
 * whole TZS above zero; a reference for bank transfer and mobile money; a date
 * from 30 days ago up to today. Messages are translation keys.
 */

export const PAYMENT_METHODS: PaymentMethod[] = ["cash", "bank", "mobile", "other"];
export const METHODS_NEEDING_REFERENCE: PaymentMethod[] = ["bank", "mobile"];

const isMethod = (value: string): value is PaymentMethod =>
  (PAYMENT_METHODS as string[]).includes(value);

// `when: () => true`: run the rule even while other fields still have errors,
// so every problem is shown on the first submit.
const always = { when: () => true };

export const paymentSchema = z
  .object({
    clientId: z.string().min(1, "validation.clientRequired"),
    projectId: z.string().min(1, "validation.projectRequired"),
    amount: z.string().refine((value) => parseTzs(value) > 0, "validation.amountPositive"),
    method: z.string().refine(isMethod, "validation.methodRequired"),
    reference: z.string().trim().max(60, "validation.tooLong"),
    receivedOn: z.string(),
    note: z.string().trim().max(500, "validation.tooLong"),
  })
  .refine(
    (values) =>
      !METHODS_NEEDING_REFERENCE.includes(values.method as PaymentMethod) ||
      Boolean(values.reference?.trim()),
    { message: "validation.referenceRequired", path: ["reference"], ...always },
  )
  .refine((values) => /^\d{4}-\d{2}-\d{2}$/.test(values.receivedOn ?? ""), {
    message: "validation.dateInvalid",
    path: ["receivedOn"],
    ...always,
  })
  .refine((values) => !values.receivedOn || values.receivedOn <= paymentDateRange().max, {
    message: "validation.dateFuture",
    path: ["receivedOn"],
    ...always,
  })
  .refine((values) => !values.receivedOn || values.receivedOn >= paymentDateRange().min, {
    message: "validation.dateTooOld",
    path: ["receivedOn"],
    ...always,
  });

export type PaymentValues = z.input<typeof paymentSchema>;
