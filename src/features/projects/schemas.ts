import { z } from "zod";
import { parseTzs } from "@/lib/format";
import { cleanTerms, termsField, type Term } from "@/lib/terms";
import type { AgreementDraft, ProjectUpdate } from "./api";

/*
 * The project and its agreement v1 draft (decided 2026-10-25). Money is a whole
 * number of shillings; every agreement term is written in English and Swahili.
 * Messages are translation keys; the server checks everything again.
 */

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const always = { when: () => true };

export const projectFormSchema = z
  .object({
    /** Chosen when creating; fixed afterwards. */
    clientId: z.string(),
    title: z
      .string()
      .trim()
      .min(3, "validation.projectTitleRequired")
      .max(120, "validation.tooLong"),
    category: z.string().trim().min(2, "validation.categoryRequired").max(60, "validation.tooLong"),
    description: z.string().trim().max(2000, "validation.tooLong"),
    deliverables: z.array(z.object({ item: z.string().max(300, "validation.tooLong") })),
    startDate: z.string().regex(DATE, "validation.dateInvalid"),
    price: z.string().refine((value) => !Number.isNaN(parseTzs(value)), "validation.amountInvalid"),
    deadline: z.string().regex(DATE, "validation.dateInvalid"),
    scope: termsField({ required: "validation.scopeRequired" }),
    exclusions: termsField(),
    paymentTerms: termsField(),
  })
  .refine(
    (values) =>
      !DATE.test(values.deadline) ||
      !DATE.test(values.startDate) ||
      values.deadline >= values.startDate,
    { message: "validation.deadlineBeforeStart", path: ["deadline"], ...always },
  );

/** Creating: a client must be chosen too. */
export const newProjectSchema = projectFormSchema.refine((values) => values.clientId !== "", {
  message: "validation.clientRequired",
  path: ["clientId"],
  ...always,
});

export type ProjectFormValues = z.infer<typeof projectFormSchema>;

const rows = (items: string[]) => items.map((item) => ({ item }));
const copy = (terms: Term[]) => terms.map((term) => ({ ...term }));

export const emptyProjectForm = (): ProjectFormValues => ({
  clientId: "",
  title: "",
  category: "",
  description: "",
  deliverables: [{ item: "" }],
  startDate: "",
  price: "",
  deadline: "",
  scope: [{ en: "", sw: "" }],
  exclusions: [],
  paymentTerms: [{ en: "", sw: "" }],
});

/** The form, filled from the saved project and its draft version. */
export function toProjectForm(
  project: {
    clientId: string;
    title: string;
    category: string;
    description: string;
    deliverables: string[];
    startDate: string;
  },
  draft: AgreementDraft,
): ProjectFormValues {
  return {
    clientId: project.clientId,
    title: project.title,
    category: project.category,
    description: project.description,
    deliverables: rows(project.deliverables),
    startDate: project.startDate,
    price: String(draft.price),
    deadline: draft.deadline,
    scope: copy(draft.scope),
    exclusions: copy(draft.exclusions),
    paymentTerms: copy(draft.paymentTerms),
  };
}

export function projectFields(values: ProjectFormValues): Required<ProjectUpdate> {
  return {
    title: values.title,
    category: values.category,
    description: values.description,
    deliverables: values.deliverables.map((row) => row.item.trim()).filter(Boolean),
    startDate: values.startDate,
  };
}

export function agreementDraft(values: ProjectFormValues): AgreementDraft {
  return {
    price: parseTzs(values.price),
    deadline: values.deadline,
    scope: cleanTerms(values.scope),
    exclusions: cleanTerms(values.exclusions),
    paymentTerms: cleanTerms(values.paymentTerms),
  };
}
