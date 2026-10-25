import { delay, HttpResponse } from "msw";
import type {
  AdminFinanceAnalytics,
  Expense,
  ExpenseCategory,
  ExpenseDraft,
  ExpensePage,
  OperatorFinanceAnalytics,
} from "@/features/expenses/api";
import type { Schema } from "@/lib/contract/types";
import { localDate } from "@/lib/dates";
import { addAudit, staffState } from "./admin-store";
import { acceptedAgreement, balanceOf, mockProjects, type MockProject } from "./client";
import { fail, on } from "./contract";
import { EXPENSE_PEOPLE, type MockExpense } from "./expense-seed";
import { assignedProjects, clientNameOf } from "./operator";

/*
 * Expenses and finance analytics (decided 2026-10-25), enforced as the server will:
 * - operators submit (PENDING), see and withdraw only their own entries, and
 *   submit VARIABLE costs only for assigned clients' projects (404 otherwise);
 * - admins enter (APPROVED at once, same person), approve or reject (reason),
 *   and correct approved expenses with REVERSAL or ADJUSTMENT rows (EXPC-…):
 *   never an edit, never below zero, one reversal per expense;
 * - analytics are cash basis and count each expense and payment once, on its
 *   own date, net of its corrections; reversed ones and anything not APPROVED
 *   count nowhere (PENDING is reported apart);
 * - clients have no expense endpoint and no such field anywhere.
 * The mock operator is Baraka Mushi and the mock admin Rehema Said.
 */

const { BARAKA, REHEMA } = EXPENSE_PEOPLE;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const PAGE_SIZE = 50;

const expenses = () => staffState().expenses;
const categories = () => staffState().expenseCategories;
const projectById = (id: string | undefined) => mockProjects().find((p) => p.id === id);

// ----- reading rows -----

const correctionsOf = (row: MockExpense) =>
  expenses().filter((other) => other.corrects === row.reference);

function present(row: MockExpense): Expense {
  const category = categories().find((c) => c.id === row.categoryId);
  const project = projectById(row.projectId);
  const { categoryId: _categoryId, ...rest } = row;
  void _categoryId;
  return {
    ...rest,
    category: { id: row.categoryId, name: category?.name ?? "" },
    projectReference: project?.reference,
    projectTitle: project?.title,
    correctedBy: row.rowType === "EXPENSE" ? correctionsOf(row).map((c) => c.reference) : [],
  };
}

/** What an expense counts for: approved amount plus adjustments; nothing if reversed or not approved. */
function countedAmount(row: MockExpense): number {
  if (row.rowType !== "EXPENSE") return 0;
  if (row.status !== "APPROVED" && row.status !== "ADJUSTED") return 0;
  return row.amount + correctionsOf(row).reduce((sum, c) => sum + c.amount, 0);
}

const newestFirst = (a: MockExpense, b: MockExpense) =>
  b.paidOn.localeCompare(a.paidOn) || b.reference.localeCompare(a.reference);

/** Offset cursors: the next page starts at that index. */
function paginate(rows: MockExpense[], url: URL): ExpensePage | null {
  const cursor = url.searchParams.get("cursor");
  const limitText = url.searchParams.get("limit");
  const start = cursor === null ? 0 : Number(cursor);
  const limit = limitText === null ? PAGE_SIZE : Number(limitText);
  if (
    !Number.isInteger(start) ||
    start < 0 ||
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > 100
  ) {
    return null;
  }
  const sorted = [...rows].sort(newestFirst);
  const pending = sorted.filter((row) => row.status === "PENDING");
  return {
    items: sorted.slice(start, start + limit).map(present),
    nextCursor: start + limit < sorted.length ? String(start + limit) : null,
    approvedTotal: sorted.reduce((sum, row) => sum + countedAmount(row), 0),
    awaitingApproval: {
      count: pending.length,
      amount: pending.reduce((sum, row) => sum + row.amount, 0),
    },
  };
}

const STATUSES = ["PENDING", "APPROVED", "REJECTED", "WITHDRAWN", "REVERSED", "ADJUSTED"];

// ----- writing rows -----

function nextReference(prefix: "EXP" | "EXPC"): string {
  const own = expenses().filter((row) => row.reference.startsWith(`${prefix}-`));
  const highest = Math.max(0, ...own.map((row) => Number(row.reference.split("-")[2]) || 0));
  return `${prefix}-2026-${String(highest + 1).padStart(prefix === "EXP" ? 3 : 4, "0")}`;
}

type Person = Schema<"Person">;

/** Checks a draft for the person entering it; returns the row's fields or an error answer. */
function checkDraft(draft: ExpenseDraft, inScope: (project: MockProject) => boolean) {
  const category = categories().find((c) => c.id === draft.categoryId);
  if (
    !DATE.test(draft.paidOn) ||
    !Number.isInteger(draft.amount) ||
    draft.amount < 1 ||
    (draft.kind !== "FIXED" && draft.kind !== "VARIABLE") ||
    !draft.description?.trim()
  ) {
    return fail(422, "VALIDATION_FAILED");
  }
  if (draft.kind === "FIXED" && draft.projectId) return fail(422, "EXPENSE_PROJECT_NOT_ALLOWED");
  if (draft.kind === "VARIABLE" && !draft.projectId) return fail(422, "EXPENSE_PROJECT_REQUIRED");
  if (draft.projectId) {
    const project = projectById(draft.projectId);
    // Someone else's project answers as if it did not exist.
    if (!project || !inScope(project)) return fail(404, "PROJECT_NOT_FOUND");
  }
  if (!category) return fail(404, "CATEGORY_NOT_FOUND");
  if (!category.active) return fail(422, "CATEGORY_INACTIVE");
  return null;
}

function addExpense(draft: ExpenseDraft, by: Person, approved: boolean): MockExpense {
  const now = new Date().toISOString();
  const row: MockExpense = {
    id: `exp_${Date.now()}_${expenses().length}`,
    reference: nextReference("EXP"),
    paidOn: draft.paidOn,
    amount: draft.amount,
    kind: draft.kind,
    categoryId: draft.categoryId,
    description: draft.description.trim(),
    vendor: draft.vendor?.trim() || undefined,
    paymentMethod: draft.paymentMethod,
    referenceNumber: draft.referenceNumber?.trim() || undefined,
    projectId: draft.kind === "VARIABLE" ? draft.projectId : undefined,
    status: approved ? "APPROVED" : "PENDING",
    rowType: "EXPENSE",
    enteredBy: by,
    enteredAt: now,
    ...(approved ? { decidedBy: by, decidedAt: now } : {}),
  };
  expenses().push(row);
  addAudit({
    actor: by.name,
    actorRole: by.role,
    action: approved ? "EXPENSE_APPROVED" : "EXPENSE_SUBMITTED",
    target: row.reference,
    amount: row.amount,
  });
  return row;
}

const findOriginal = (expenseId: string) => expenses().find((row) => row.id === expenseId);

/** The approved expense to correct, or the reason it cannot be corrected. */
function correctable(expenseId: string) {
  const row = findOriginal(expenseId);
  if (!row) return fail(404, "EXPENSE_NOT_FOUND");
  if (row.status === "REVERSED") return fail(409, "EXPENSE_ALREADY_REVERSED");
  if (row.rowType !== "EXPENSE" || (row.status !== "APPROVED" && row.status !== "ADJUSTED")) {
    return fail(409, "EXPENSE_NOT_APPROVED");
  }
  return row;
}

function addCorrection(
  original: MockExpense,
  type: "REVERSAL" | "ADJUSTMENT",
  amount: number,
  reason: string,
) {
  const now = new Date().toISOString();
  const row: MockExpense = {
    id: `expc_${Date.now()}_${expenses().length}`,
    reference: nextReference("EXPC"),
    paidOn: localDate(),
    amount,
    kind: original.kind,
    categoryId: original.categoryId,
    description: original.description,
    paymentMethod: original.paymentMethod,
    projectId: original.projectId,
    status: "APPROVED",
    rowType: type,
    corrects: original.reference,
    enteredBy: REHEMA,
    enteredAt: now,
    decidedBy: REHEMA,
    decidedAt: now,
    decisionReason: reason,
  };
  expenses().push(row);
  original.status = type === "REVERSAL" ? "REVERSED" : "ADJUSTED";
  addAudit({
    actor: REHEMA.name,
    actorRole: "ADMIN",
    action: type === "REVERSAL" ? "EXPENSE_REVERSED" : "EXPENSE_ADJUSTED",
    target: original.reference,
    correction: row.reference,
    amount,
    reason,
  });
  return HttpResponse.json<Expense>(present(row), { status: 201 });
}

async function reasonOf(request: Request): Promise<string> {
  const body = (await request.json().catch(() => ({}))) as { reason?: string };
  return body.reason?.trim() ?? "";
}

// ----- analytics -----

function readPeriod(url: URL): { from: string; to: string } | null {
  const from = url.searchParams.get("from") ?? "";
  const to = url.searchParams.get("to") ?? "";
  return DATE.test(from) && DATE.test(to) && from <= to ? { from, to } : null;
}

const inPeriod = (day: string, period: { from: string; to: string }) =>
  day >= period.from && day <= period.to;

/** Each payment once, on the day received, net of its corrections (a reversed one nets to 0). */
function collectedIn(project: MockProject, period: { from: string; to: string }) {
  return project.payments
    .filter((row) => (row.kind ?? "PAYMENT") === "PAYMENT")
    .map((row) => ({
      day: localDate(new Date(row.receivedAt)),
      amount:
        row.amount +
        project.payments
          .filter((c) => c.corrects === row.receiptNumber)
          .reduce((sum, c) => sum + c.amount, 0),
    }))
    .filter((entry) => inPeriod(entry.day, period));
}

function monthsOf(period: { from: string; to: string }): string[] {
  const months: string[] = [];
  let [year, month] = period.from.slice(0, 7).split("-").map(Number) as [number, number];
  const last = period.to.slice(0, 7);
  for (;;) {
    const key = `${year}-${String(month).padStart(2, "0")}`;
    months.push(key);
    if (key >= last) return months;
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }
}

const margin = (profit: number, collected: number) =>
  collected > 0 ? Math.round((profit * 10_000) / collected) : null;

interface Scope {
  projects: MockProject[];
  /** Expenses that may count: admins every one, operators variable ones of their projects. */
  expenses: MockExpense[];
}

function analytics(scope: Scope, period: { from: string; to: string }, withFixed: boolean) {
  const counted = scope.expenses.filter(
    (row) => inPeriod(row.paidOn, period) && countedAmount(row) !== 0,
  );
  const pending = scope.expenses.filter(
    (row) => row.status === "PENDING" && inPeriod(row.paidOn, period),
  );
  const payments = scope.projects.flatMap((project) =>
    collectedIn(project, period).map((entry) => ({ ...entry, projectId: project.id })),
  );
  const sum = <T>(rows: T[], value: (row: T) => number) =>
    rows.reduce((total, row) => total + value(row), 0);

  const fixed = counted.filter((row) => row.kind === "FIXED");
  const variable = counted.filter((row) => row.kind === "VARIABLE");
  const collected = sum(payments, (p) => p.amount);
  const fixedTotal = sum(fixed, countedAmount);
  const variableTotal = sum(variable, countedAmount);
  const expensesTotal = withFixed ? fixedTotal + variableTotal : variableTotal;
  const profit = collected - expensesTotal;

  const monthly = monthsOf(period).map((month) => {
    const monthCollected = sum(
      payments.filter((p) => p.day.startsWith(month)),
      (p) => p.amount,
    );
    const monthFixed = sum(
      fixed.filter((r) => r.paidOn.startsWith(month)),
      countedAmount,
    );
    const monthVariable = sum(
      variable.filter((r) => r.paidOn.startsWith(month)),
      countedAmount,
    );
    const monthExpenses = withFixed ? monthFixed + monthVariable : monthVariable;
    return {
      month,
      collected: monthCollected,
      expenses: monthExpenses,
      ...(withFixed ? { fixedExpenses: monthFixed, variableExpenses: monthVariable } : {}),
      profit: monthCollected - monthExpenses,
    };
  });

  const byCategory = [...new Set((withFixed ? counted : variable).map((r) => r.categoryId))]
    .map((categoryId) => ({
      categoryId,
      name: categories().find((c) => c.id === categoryId)?.name ?? "",
      amount: sum(
        (withFixed ? counted : variable).filter((r) => r.categoryId === categoryId),
        countedAmount,
      ),
    }))
    .sort((a, b) => b.amount - a.amount);

  const live = scope.projects.filter((project) => project.status !== "DRAFT");
  const projects = live.map((project) => {
    const projectCollected = sum(
      payments.filter((p) => p.projectId === project.id),
      (p) => p.amount,
    );
    const projectExpenses = sum(
      variable.filter((r) => r.projectId === project.id),
      countedAmount,
    );
    const projectProfit = projectCollected - projectExpenses;
    return {
      projectId: project.id,
      reference: project.reference,
      title: project.title,
      clientName: clientNameOf(project),
      agreedValue: acceptedAgreement(project)?.price ?? 0,
      collected: projectCollected,
      outstanding: balanceOf(project).balance,
      expenses: projectExpenses,
      profit: projectProfit,
      marginBasisPoints: margin(projectProfit, projectCollected),
    };
  });

  return {
    period,
    agreedValue: sum(projects, (p) => p.agreedValue),
    collected,
    outstanding: sum(projects, (p) => p.outstanding),
    fixedTotal,
    variableTotal,
    expensesTotal,
    profit,
    marginBasisPoints: margin(profit, collected),
    awaitingApproval: { count: pending.length, amount: sum(pending, (r) => r.amount) },
    monthly,
    byCategory,
    projects,
  };
}

// ----- handlers -----

const isMine = (row: MockExpense) => row.enteredBy.id === BARAKA.id;
const assignedIds = () => new Set(assignedProjects().map((project) => project.id));

export const expenseHandlers = [
  // ----- operator
  on.get("/operator/expenses", async ({ request }) => {
    await delay();
    const url = new URL(request.url);
    const status = url.searchParams.get("status");
    const projectId = url.searchParams.get("projectId");
    if (status && !STATUSES.includes(status)) return fail(422, "VALIDATION_FAILED");
    // Only this operator's own entries: never the company's fixed costs or anyone else's.
    const rows = expenses().filter(
      (row) =>
        isMine(row) &&
        (!status || row.status === status) &&
        (!projectId || row.projectId === projectId),
    );
    const page = paginate(rows, url);
    return page ? HttpResponse.json(page) : fail(422, "VALIDATION_FAILED");
  }),

  on.post("/operator/expenses", async ({ request }) => {
    await delay();
    const draft = await request.json();
    const ids = assignedIds();
    const refused = checkDraft(draft, (project) => ids.has(project.id));
    if (refused) return refused;
    return HttpResponse.json(present(addExpense(draft, BARAKA, false)), { status: 201 });
  }),

  on.post("/operator/expenses/{expenseId}/withdrawal", async ({ params }) => {
    await delay();
    const row = findOriginal(params.expenseId);
    if (!row || !isMine(row)) return fail(404, "EXPENSE_NOT_FOUND");
    if (row.status !== "PENDING") return fail(409, "EXPENSE_NOT_PENDING");
    row.status = "WITHDRAWN";
    addAudit({
      actor: BARAKA.name,
      actorRole: "OPERATOR",
      action: "EXPENSE_WITHDRAWN",
      target: row.reference,
      amount: row.amount,
    });
    return HttpResponse.json(present(row));
  }),

  on.get("/operator/expense-categories", async () => {
    await delay();
    return HttpResponse.json(
      categories()
        .filter((c) => c.active)
        .map(({ id, name }) => ({ id, name }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    );
  }),

  on.get("/operator/finance", async ({ request }) => {
    await delay();
    const period = readPeriod(new URL(request.url));
    if (!period) return fail(422, "VALIDATION_FAILED");
    const ids = assignedIds();
    const result = analytics(
      {
        projects: assignedProjects(),
        // Variable costs of assigned projects only, whoever entered them; no fixed costs.
        expenses: expenses().filter(
          (row) => row.kind === "VARIABLE" && row.projectId !== undefined && ids.has(row.projectId),
        ),
      },
      period,
      false,
    );
    const body: OperatorFinanceAnalytics = {
      period: result.period,
      agreedValue: result.agreedValue,
      collected: result.collected,
      outstanding: result.outstanding,
      variableExpenses: result.variableTotal,
      profit: result.profit,
      marginBasisPoints: result.marginBasisPoints,
      awaitingApproval: result.awaitingApproval,
      monthly: result.monthly,
      byCategory: result.byCategory,
      projects: result.projects,
    };
    return HttpResponse.json(body);
  }),

  // ----- admin
  on.get("/admin/expenses", async ({ request }) => {
    await delay();
    const url = new URL(request.url);
    const get = (name: string) => url.searchParams.get(name);
    const [status, kind, categoryId, projectId, enteredById, from, to] = [
      get("status"),
      get("kind"),
      get("categoryId"),
      get("projectId"),
      get("enteredById"),
      get("from"),
      get("to"),
    ];
    if (
      (status && !STATUSES.includes(status)) ||
      (kind && kind !== "FIXED" && kind !== "VARIABLE") ||
      (from && !DATE.test(from)) ||
      (to && !DATE.test(to))
    ) {
      return fail(422, "VALIDATION_FAILED");
    }
    const rows = expenses().filter(
      (row) =>
        (!status || row.status === status) &&
        (!kind || row.kind === kind) &&
        (!categoryId || row.categoryId === categoryId) &&
        (!projectId || row.projectId === projectId) &&
        (!enteredById || row.enteredBy.id === enteredById) &&
        (!from || row.paidOn >= from) &&
        (!to || row.paidOn <= to),
    );
    const page = paginate(rows, url);
    return page ? HttpResponse.json(page) : fail(422, "VALIDATION_FAILED");
  }),

  on.post("/admin/expenses", async ({ request }) => {
    await delay();
    const draft = await request.json();
    const refused = checkDraft(draft, () => true);
    if (refused) return refused;
    return HttpResponse.json(present(addExpense(draft, REHEMA, true)), { status: 201 });
  }),

  on.get("/admin/expenses/pending", async () => {
    await delay();
    const pending = expenses().filter((row) => row.status === "PENDING");
    return HttpResponse.json({
      count: pending.length,
      amount: pending.reduce((sum, row) => sum + row.amount, 0),
    });
  }),

  on.post("/admin/expenses/{expenseId}/approval", async ({ params }) => {
    await delay();
    const row = findOriginal(params.expenseId);
    if (!row) return fail(404, "EXPENSE_NOT_FOUND");
    if (row.status !== "PENDING") return fail(409, "EXPENSE_NOT_PENDING");
    row.status = "APPROVED";
    row.decidedBy = REHEMA;
    row.decidedAt = new Date().toISOString();
    addAudit({
      actor: REHEMA.name,
      actorRole: "ADMIN",
      action: "EXPENSE_APPROVED",
      target: row.reference,
      amount: row.amount,
    });
    return HttpResponse.json(present(row));
  }),

  on.post("/admin/expenses/{expenseId}/rejection", async ({ params, request }) => {
    await delay();
    const row = findOriginal(params.expenseId);
    if (!row) return fail(404, "EXPENSE_NOT_FOUND");
    if (row.status !== "PENDING") return fail(409, "EXPENSE_NOT_PENDING");
    const reason = await reasonOf(request);
    if (!reason) return fail(422, "REASON_REQUIRED");
    row.status = "REJECTED";
    row.decidedBy = REHEMA;
    row.decidedAt = new Date().toISOString();
    row.decisionReason = reason;
    addAudit({
      actor: REHEMA.name,
      actorRole: "ADMIN",
      action: "EXPENSE_REJECTED",
      target: row.reference,
      amount: row.amount,
      reason,
    });
    return HttpResponse.json(present(row));
  }),

  on.post("/admin/expenses/{expenseId}/reversal", async ({ params, request }) => {
    await delay();
    const found = correctable(params.expenseId);
    if (found instanceof Response) return found;
    const reason = await reasonOf(request);
    if (!reason) return fail(422, "REASON_REQUIRED");
    // Minus what is left, so the expense and its corrections end at zero.
    return addCorrection(found, "REVERSAL", -countedAmount(found), reason);
  }),

  on.post("/admin/expenses/{expenseId}/adjustment", async ({ params, request }) => {
    await delay();
    const found = correctable(params.expenseId);
    if (found instanceof Response) return found;
    const body = (await request.json().catch(() => ({}))) as { amount?: number; reason?: string };
    const reason = body.reason?.trim() ?? "";
    if (!Number.isInteger(body.amount) || body.amount === 0) return fail(422, "VALIDATION_FAILED");
    if (!reason) return fail(422, "REASON_REQUIRED");
    const amount = body.amount as number;
    if (countedAmount(found) + amount < 0) return fail(422, "ADJUSTMENT_BELOW_ZERO");
    return addCorrection(found, "ADJUSTMENT", amount, reason);
  }),

  on.get("/admin/expense-categories", async () => {
    await delay();
    return HttpResponse.json(
      [...categories()]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((c): ExpenseCategory => ({
          ...c,
          usageCount: expenses().filter((row) => row.categoryId === c.id).length,
        })),
    );
  }),

  on.post("/admin/expense-categories", async ({ request }) => {
    await delay();
    const name = (await request.json()).name?.trim() ?? "";
    if (name.length < 2 || name.length > 40) return fail(422, "VALIDATION_FAILED");
    if (categories().some((c) => c.name.toLowerCase() === name.toLowerCase())) {
      return fail(409, "CATEGORY_NAME_TAKEN");
    }
    const category = { id: `cat_${Date.now()}`, name, active: true };
    categories().push(category);
    addAudit({
      actor: REHEMA.name,
      actorRole: "ADMIN",
      action: "EXPENSE_CATEGORY_CHANGED",
      target: name,
      to: "added",
    });
    return HttpResponse.json({ ...category, usageCount: 0 }, { status: 201 });
  }),

  on.patch("/admin/expense-categories/{categoryId}", async ({ params, request }) => {
    await delay();
    const category = categories().find((c) => c.id === params.categoryId);
    if (!category) return fail(404, "CATEGORY_NOT_FOUND");
    const body = await request.json();
    const name = body.name?.trim();
    if (
      Object.keys(body).length === 0 ||
      (body.name !== undefined && (!name || name.length < 2 || name.length > 40)) ||
      (body.active !== undefined && typeof body.active !== "boolean")
    ) {
      return fail(422, "VALIDATION_FAILED");
    }
    if (
      name &&
      categories().some((c) => c.id !== category.id && c.name.toLowerCase() === name.toLowerCase())
    ) {
      return fail(409, "CATEGORY_NAME_TAKEN");
    }
    const before = `${category.name}${category.active ? "" : " (inactive)"}`;
    if (name) category.name = name;
    if (body.active !== undefined) category.active = body.active;
    addAudit({
      actor: REHEMA.name,
      actorRole: "ADMIN",
      action: "EXPENSE_CATEGORY_CHANGED",
      target: category.name,
      from: before,
      to: `${category.name}${category.active ? "" : " (inactive)"}`,
    });
    return HttpResponse.json({
      ...category,
      usageCount: expenses().filter((row) => row.categoryId === category.id).length,
    });
  }),

  on.delete("/admin/expense-categories/{categoryId}", async ({ params }) => {
    await delay();
    const index = categories().findIndex((c) => c.id === params.categoryId);
    const category = categories()[index];
    if (!category) return fail(404, "CATEGORY_NOT_FOUND");
    if (expenses().some((row) => row.categoryId === category.id)) {
      return fail(409, "CATEGORY_IN_USE");
    }
    categories().splice(index, 1);
    addAudit({
      actor: REHEMA.name,
      actorRole: "ADMIN",
      action: "EXPENSE_CATEGORY_CHANGED",
      target: category.name,
      to: "deleted",
    });
    return new HttpResponse(null, { status: 204 });
  }),

  on.get("/admin/finance/analytics", async ({ request }) => {
    await delay();
    const period = readPeriod(new URL(request.url));
    if (!period) return fail(422, "VALIDATION_FAILED");
    const result = analytics({ projects: mockProjects(), expenses: expenses() }, period, true);
    const body: AdminFinanceAnalytics = {
      period: result.period,
      agreedValue: result.agreedValue,
      collected: result.collected,
      outstanding: result.outstanding,
      fixedExpenses: result.fixedTotal,
      variableExpenses: result.variableTotal,
      expenses: result.expensesTotal,
      profit: result.profit,
      marginBasisPoints: result.marginBasisPoints,
      awaitingApproval: result.awaitingApproval,
      monthly: result.monthly,
      byCategory: result.byCategory,
      projects: result.projects,
    };
    return HttpResponse.json(body);
  }),
];
