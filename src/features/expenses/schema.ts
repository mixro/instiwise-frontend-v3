import { z } from "zod";
import type { PaymentMethod } from "@/features/client/api";
import { localDate } from "@/lib/dates";
import { parseTzs } from "@/lib/format";
import type { ExpenseDraft, ExpenseKind } from "./api";

/*
 * The expense form (decided 2026-10-25): whole TZS above zero, a date paid that
 * is not in the future, a category, what it was for, how it was paid; a project
 * for VARIABLE costs and none for FIXED ones. Messages are translation keys; the
 * server checks everything again.
 */

export const EXPENSE_KINDS: ExpenseKind[] = ["VARIABLE", "FIXED"];
export const EXPENSE_METHODS: PaymentMethod[] = ["cash", "bank", "mobile", "other"];

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const always = { when: () => true };
/** A plain boolean, not a type guard: the form keeps "" until a method is chosen. */
const isMethod = (value: string): boolean => (EXPENSE_METHODS as string[]).includes(value);

export const expenseSchema = z
  .object({
    paidOn: z.string().regex(DATE, "validation.dateInvalid"),
    amount: z.string().refine((value) => parseTzs(value) > 0, "validation.amountPositive"),
    kind: z.enum(["VARIABLE", "FIXED"]),
    categoryId: z.string().min(1, "validation.expenseCategoryRequired"),
    description: z
      .string()
      .trim()
      .min(3, "validation.expenseDescriptionRequired")
      .max(300, "validation.tooLong"),
    vendor: z.string().trim().max(100, "validation.tooLong"),
    paymentMethod: z.string().refine(isMethod, "validation.expenseMethodRequired"),
    referenceNumber: z.string().trim().max(60, "validation.tooLong"),
    projectId: z.string(),
  })
  .refine((values) => !DATE.test(values.paidOn) || values.paidOn <= localDate(), {
    message: "validation.dateInFuture",
    path: ["paidOn"],
    ...always,
  })
  .refine((values) => values.kind !== "VARIABLE" || values.projectId !== "", {
    message: "validation.projectRequired",
    path: ["projectId"],
    ...always,
  });

export type ExpenseValues = z.infer<typeof expenseSchema>;

export const emptyExpense = (): ExpenseValues => ({
  paidOn: localDate(),
  amount: "",
  kind: "VARIABLE",
  categoryId: "",
  description: "",
  vendor: "",
  paymentMethod: "",
  referenceNumber: "",
  projectId: "",
});

export function toExpenseDraft(values: ExpenseValues): ExpenseDraft {
  return {
    paidOn: values.paidOn,
    amount: parseTzs(values.amount),
    kind: values.kind,
    categoryId: values.categoryId,
    description: values.description.trim(),
    vendor: values.vendor.trim() || undefined,
    paymentMethod: values.paymentMethod as PaymentMethod,
    referenceNumber: values.referenceNumber.trim() || undefined,
    // A fixed cost belongs to no project.
    projectId: values.kind === "VARIABLE" ? values.projectId : undefined,
  };
}
