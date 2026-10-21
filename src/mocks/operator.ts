import { delay, HttpResponse } from "msw";
import type { Balance, PaymentMethod } from "@/features/client/api";
import type {
  ClientDetail,
  ClientSummary,
  OperatorDashboard,
  PaymentDraft,
  PaymentPreview,
  StaffPayment,
  StaffProject,
} from "@/features/operator/api";
import { addDays, localDate, paymentDateRange } from "@/lib/dates";
import type { OperatorProfile } from "@/features/operator/api";
import { addAudit, operatorById, staffState } from "./admin-store";
import { accountLanguage, renameAccount, setAccountLanguage } from "./auth";
import { fail, on } from "./contract";
import {
  balanceOf,
  mockProjects,
  presentPayment,
  receiptFor,
  type MockPayment,
  type MockProject,
} from "./client";
import { MOCK_OPERATOR, MOCK_OPERATOR_ID, type MockClient } from "./staff-seed";

/*
 * Operator endpoints for the mock operator (Baraka Mushi). Every handler starts
 * from assignedClients()/assignedProjects(): unassigned clients are not filtered
 * out at the end, they are never read. Asking for one answers 404.
 */

const METHODS: PaymentMethod[] = ["cash", "bank", "mobile", "other"];
const NEEDS_REFERENCE: PaymentMethod[] = ["bank", "mobile"];
const UPCOMING_DAYS = 30;

const assignedClients = (): MockClient[] =>
  staffState().clients.filter((client) => client.operatorId === MOCK_OPERATOR_ID);

export function assignedProjects(): MockProject[] {
  const ids = new Set(assignedClients().map((client) => client.id));
  return mockProjects().filter((project) => ids.has(project.clientId));
}

export function sumBalances(balances: Balance[]): Balance {
  return balances.reduce(
    (t, b) => ({
      agreedAmount: t.agreedAmount + b.agreedAmount,
      paidAmount: t.paidAmount + b.paidAmount,
      balance: t.balance + b.balance,
      credit: t.credit + b.credit,
    }),
    { agreedAmount: 0, paidAmount: 0, balance: 0, credit: 0 },
  );
}

export function clientNameOf(project: MockProject): string {
  return staffState().clients.find((c) => c.id === project.clientId)?.name ?? project.clientName;
}

/** Payment and correction rows of these projects, as staff see them, newest first. */
export function staffPayments(projects: MockProject[]): StaffPayment[] {
  return projects
    .flatMap((project) =>
      project.payments.map((row: MockPayment) => ({
        ...presentPayment(project, row),
        recordedBy: row.recordedBy ?? project.operatorName,
        clientId: project.clientId,
        clientName: clientNameOf(project),
      })),
    )
    .sort((a, b) => b.receivedAt.localeCompare(a.receivedAt));
}

/**
 * Money recorded in the current calendar month (Dar es Salaam time): every row
 * dated this month, corrections included, so the figure is net. Counts payments.
 */
export function recordedThisMonth(rows: StaffPayment[]) {
  const month = localDate().slice(0, 7);
  const inMonth = rows.filter((row) => localDate(new Date(row.receivedAt)).startsWith(month));
  return {
    month,
    amount: inMonth.reduce((total, row) => total + row.amount, 0),
    count: inMonth.filter((row) => row.kind === "PAYMENT").length,
  };
}

function staffProject(project: MockProject): StaffProject {
  return {
    id: project.id,
    reference: project.reference,
    title: project.title,
    status: project.status,
    deadline: project.deadline,
    ...balanceOf(project),
  };
}

function clientSummary(client: MockClient): ClientSummary {
  const projects = assignedProjects().filter((p) => p.clientId === client.id);
  return {
    id: client.id,
    name: client.name,
    email: client.email,
    phone: client.phone,
    projectCount: projects.length,
    ...sumBalances(projects.map(balanceOf)),
  };
}

/** Server-side checks for a payment draft. Returns an error response or the project. */
function checkDraft(draft: PaymentDraft): MockProject | ReturnType<typeof fail> {
  const project = assignedProjects().find((p) => p.id === draft.projectId);
  if (!project) return fail(404, "PROJECT_NOT_FOUND");
  if (!Number.isInteger(draft.amount) || draft.amount <= 0 || !METHODS.includes(draft.method)) {
    return fail(422, "VALIDATION_FAILED");
  }
  if (NEEDS_REFERENCE.includes(draft.method) && !draft.reference?.trim()) {
    return fail(422, "PAYMENT_REFERENCE_REQUIRED");
  }
  const { min, max } = paymentDateRange();
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(draft.receivedOn) ||
    draft.receivedOn < min ||
    draft.receivedOn > max
  ) {
    return fail(422, "PAYMENT_DATE_OUT_OF_RANGE");
  }
  return project;
}

function nextReceiptNumber(): string {
  const highest = Math.max(
    0,
    ...mockProjects().flatMap((p) =>
      p.payments
        .filter((row) => row.receiptNumber.startsWith("RC-"))
        .map((row) => Number(row.receiptNumber.slice(-4))),
    ),
  );
  return `RC-2026-${String(highest + 1).padStart(4, "0")}`;
}

const PHONE = /^\+255[1-9]\d{8}$/;

/** The mock operator's own profile: their details, and a count of their clients only. */
function operatorProfile(): OperatorProfile | undefined {
  const operator = operatorById(MOCK_OPERATOR_ID);
  if (!operator) return undefined;
  return {
    name: operator.name,
    email: operator.email,
    phone: operator.phone,
    preferredLanguage: accountLanguage(operator.email),
    status: operator.status,
    registeredAt: operator.registeredAt,
    assignedClientCount: assignedClients().length,
    permissions: operator.permissions,
  };
}

export const operatorHandlers = [
  on.get("/operator/profile", async () => {
    await delay();
    const profile = operatorProfile();
    return profile ? HttpResponse.json(profile) : fail(403, "FORBIDDEN");
  }),

  on.patch("/operator/profile", async ({ request }) => {
    await delay();
    const operator = operatorById(MOCK_OPERATOR_ID);
    if (!operator) return fail(403, "FORBIDDEN");
    const body = await request.json();
    const name = body.name?.trim();
    // Only name, phone and language; anything else (email, permissions…) is not accepted.
    const allowed = ["name", "phone", "preferredLanguage"];
    if (
      Object.keys(body).length === 0 ||
      Object.keys(body).some((key) => !allowed.includes(key)) ||
      (body.name !== undefined && (!name || name.length < 2 || name.length > 100)) ||
      (body.phone !== undefined && !PHONE.test(body.phone)) ||
      (body.preferredLanguage !== undefined && !["en", "sw"].includes(body.preferredLanguage))
    ) {
      return fail(422, "VALIDATION_FAILED");
    }
    if (name) {
      operator.name = name;
      renameAccount(operator.email, name);
    }
    if (body.phone) operator.phone = body.phone;
    if (body.preferredLanguage) setAccountLanguage(operator.email, body.preferredLanguage);
    const profile = operatorProfile();
    return profile ? HttpResponse.json(profile) : fail(403, "FORBIDDEN");
  }),

  on.get("/operator/dashboard", async () => {
    await delay();
    const projects = assignedProjects();
    const today = localDate();
    const horizon = addDays(today, UPCOMING_DAYS);
    const dashboard: OperatorDashboard = {
      clientCount: assignedClients().length,
      projectCount: projects.length,
      activeProjectCount: projects.filter((p) => p.status === "ACTIVE").length,
      openChangeCount: projects.flatMap((p) =>
        p.changeRequests.filter(
          (c) => c.status === "UNDER_REVIEW" || c.status === "AWAITING_CLIENT_ACCEPTANCE",
        ),
      ).length,
      totals: sumBalances(projects.map(balanceOf)),
      recordedThisMonth: recordedThisMonth(staffPayments(projects)),
      upcomingDeadlines: projects
        .filter((p) => p.status === "ACTIVE" && p.deadline >= today && p.deadline <= horizon)
        .sort((a, b) => a.deadline.localeCompare(b.deadline))
        .map((p) => ({
          projectId: p.id,
          title: p.title,
          clientName: clientNameOf(p),
          deadline: p.deadline,
        })),
      recentPayments: staffPayments(projects).slice(0, 5),
    };
    return HttpResponse.json(dashboard);
  }),

  on.get("/operator/clients", async () => {
    await delay();
    return HttpResponse.json(assignedClients().map(clientSummary));
  }),

  on.get("/operator/clients/{clientId}", async ({ params }) => {
    await delay();
    const client = assignedClients().find((c) => c.id === params.clientId);
    if (!client) return fail(404, "CLIENT_NOT_FOUND");
    const projects = assignedProjects().filter((p) => p.clientId === client.id);
    const detail: ClientDetail = {
      client: clientSummary(client),
      projects: projects.map(staffProject),
      payments: staffPayments(projects),
    };
    return HttpResponse.json(detail);
  }),

  on.get("/operator/payments", async () => {
    await delay();
    // One page holds every demo row.
    return HttpResponse.json({ items: staffPayments(assignedProjects()), nextCursor: null });
  }),

  on.post("/operator/payments/preview", async ({ request }) => {
    await delay();
    const draft = await request.json();
    const checked = checkDraft(draft);
    if (checked instanceof Response) return checked;
    const before = balanceOf(checked);
    const paid = before.paidAmount + draft.amount;
    const preview: PaymentPreview = {
      clientName: clientNameOf(checked),
      projectTitle: checked.title,
      projectReference: checked.reference,
      balanceBefore: before.balance,
      balanceAfter: Math.max(before.agreedAmount - paid, 0),
      creditAfter: Math.max(paid - before.agreedAmount, 0),
    };
    return HttpResponse.json(preview);
  }),

  on.post("/operator/payments", async ({ request }) => {
    await delay();
    const draft = await request.json();
    const checked = checkDraft(draft);
    if (checked instanceof Response) return checked;
    const payment: MockPayment = {
      id: `pay_${Date.now()}`,
      receiptNumber: nextReceiptNumber(),
      // Midday in Dar es Salaam on the chosen day.
      receivedAt: `${draft.receivedOn}T09:00:00Z`,
      amount: draft.amount,
      method: draft.method,
      reference: draft.reference?.trim() || undefined,
      status: "RECORDED",
      recordedBy: MOCK_OPERATOR,
    };
    checked.payments.push(payment);
    addAudit({
      actor: MOCK_OPERATOR,
      actorRole: "OPERATOR",
      action: "PAYMENT_RECORDED",
      target: payment.receiptNumber,
      amount: payment.amount,
    });
    const recorded = staffPayments([checked]).find((p) => p.id === payment.id);
    return recorded ? HttpResponse.json(recorded, { status: 201 }) : fail(500, "INTERNAL_ERROR");
  }),

  on.get("/operator/receipts/{receiptNumber}", async ({ params }) => {
    await delay();
    for (const project of assignedProjects()) {
      const receipt = receiptFor(project, params.receiptNumber);
      if (receipt) return HttpResponse.json(receipt);
    }
    return fail(404, "RECEIPT_NOT_FOUND");
  }),
];
