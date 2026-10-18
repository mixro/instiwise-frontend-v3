import { delay, HttpResponse } from "msw";
import type {
  AdminClient,
  AdminOperator,
  AdminOverview,
  AdminProject,
  AuditAction,
  AuditEntry,
} from "@/features/admin/api";
import { SETTINGS_LIMITS } from "@/features/admin/api";
import { localDate } from "@/lib/dates";
import { normalizeTzPhone } from "@/lib/phone";
import { addAudit, MOCK_ADMIN, operatorById, staffState, type MockOperator } from "./admin-store";
import { setMockAccountState } from "./auth";
import { fail, on } from "./contract";
import { balanceOf, mockProjects, type MockPayment, type MockProject } from "./client";
import { clientNameOf, recordedThisMonth, staffPayments, sumBalances } from "./operator";
import type { MockClient } from "./staff-seed";
import type { StaffPayment } from "@/features/operator/api";

/*
 * Admin endpoints: system-wide. The rules live here, as on the real server:
 * corrections are new COR rows and never edit or delete a payment; every
 * correction needs a reason and goes to the audit log; an operator with clients
 * cannot be suspended; only active operators get clients.
 */

async function reasonFrom(request: Request): Promise<string> {
  const body = (await request.json().catch(() => ({}))) as { reason?: string };
  return body.reason?.trim() ?? "";
}

function adminClient(client: MockClient): AdminClient {
  const projects = mockProjects().filter((p) => p.clientId === client.id);
  const operator = operatorById(client.operatorId);
  return {
    id: client.id,
    name: client.name,
    email: client.email,
    phone: client.phone,
    projectCount: projects.length,
    operator: operator ? { id: operator.id, name: operator.name } : null,
    ...sumBalances(projects.map(balanceOf)),
  };
}

function adminOperator(operator: MockOperator): AdminOperator {
  return {
    ...operator,
    clients: staffState()
      .clients.filter((client) => client.operatorId === operator.id)
      .map(({ id, name }) => ({ id, name })),
  };
}

function adminProject(project: MockProject): AdminProject {
  const client = staffState().clients.find((c) => c.id === project.clientId);
  return {
    id: project.id,
    reference: project.reference,
    title: project.title,
    status: project.status,
    deadline: project.deadline,
    clientName: clientNameOf(project),
    operatorName: operatorById(client?.operatorId)?.name ?? null,
    openChange: project.changeRequests.some(
      (c) => c.status === "UNDER_REVIEW" || c.status === "AWAITING_CLIENT_ACCEPTANCE",
    ),
    ...balanceOf(project),
  };
}

/** The newest first. */
function auditLog(): AuditEntry[] {
  return [...staffState().audit].sort((a, b) => b.at.localeCompare(a.at));
}

function findPayment(id: unknown): { project: MockProject; row: MockPayment } | undefined {
  for (const project of mockProjects()) {
    const row = project.payments.find((p) => p.id === id);
    if (row) return { project, row };
  }
  return undefined;
}

function nextCorrectionNumber(): string {
  const count = mockProjects().reduce(
    (total, p) => total + p.payments.filter((row) => row.receiptNumber.startsWith("COR-")).length,
    0,
  );
  return `COR-2026-${String(count + 1).padStart(4, "0")}`;
}

/** What is left of a payment after the corrections made to it so far. */
function netOf(project: MockProject, row: MockPayment): number {
  return project.payments
    .filter((p) => p === row || p.corrects === row.receiptNumber)
    .reduce((total, p) => total + p.amount, 0);
}

/** Validates the corrected payment and returns it, or an error response. */
function correctable(
  id: unknown,
): { project: MockProject; row: MockPayment } | ReturnType<typeof fail> {
  const found = findPayment(id);
  if (!found || (found.row.kind ?? "PAYMENT") !== "PAYMENT") return fail(404, "PAYMENT_NOT_FOUND");
  if (found.row.status === "REVERSED") return fail(409, "PAYMENT_ALREADY_REVERSED");
  return found;
}

function addCorrection(
  project: MockProject,
  original: MockPayment,
  kind: "REVERSAL" | "ADJUSTMENT",
  amount: number,
  reason: string,
): MockPayment {
  const row: MockPayment = {
    id: `cor_${Date.now()}`,
    kind,
    receiptNumber: nextCorrectionNumber(),
    corrects: original.receiptNumber,
    receivedAt: new Date().toISOString(),
    amount,
    method: original.method,
    status: "RECORDED",
    recordedBy: MOCK_ADMIN,
    reason,
  };
  project.payments.push(row);
  original.status = kind === "REVERSAL" ? "REVERSED" : "ADJUSTED";
  addAudit({
    actor: MOCK_ADMIN,
    actorRole: "ADMIN",
    action: kind === "REVERSAL" ? "PAYMENT_REVERSED" : "PAYMENT_ADJUSTED",
    target: original.receiptNumber,
    correction: row.receiptNumber,
    amount,
    reason,
    at: row.receivedAt,
  });
  return row;
}

/** The new COR row as staff see it (201, the contract's CorrectionCreated). */
function correctionRow(project: MockProject, row: MockPayment) {
  const created = staffPayments([project]).find((p) => p.id === row.id);
  return created
    ? HttpResponse.json<StaffPayment>(created, { status: 201 })
    : fail(500, "INTERNAL_ERROR");
}

const OPERATOR_ACTIONS = ["approve", "reject", "suspend", "reactivate"] as const;
type OperatorAction = (typeof OPERATOR_ACTIONS)[number];

interface OperatorRule {
  from: MockOperator["status"];
  to: MockOperator["status"];
  audit: AuditAction;
  needsReason: boolean;
}

const OPERATOR_RULES: Record<OperatorAction, OperatorRule> = {
  approve: {
    from: "PENDING_APPROVAL",
    to: "ACTIVE",
    audit: "OPERATOR_APPROVED",
    needsReason: false,
  },
  reject: {
    from: "PENDING_APPROVAL",
    to: "REJECTED",
    audit: "OPERATOR_REJECTED",
    needsReason: true,
  },
  suspend: { from: "ACTIVE", to: "SUSPENDED", audit: "OPERATOR_SUSPENDED", needsReason: true },
  reactivate: {
    from: "SUSPENDED",
    to: "ACTIVE",
    audit: "OPERATOR_REACTIVATED",
    needsReason: false,
  },
};

function operatorAction(operatorId: string, action: OperatorAction, reason: string) {
  const operator = operatorById(operatorId);
  if (!operator) return fail(404, "OPERATOR_NOT_FOUND");
  const rule = OPERATOR_RULES[action];
  if (operator.status !== rule.from) {
    return fail(
      409,
      rule.from === "PENDING_APPROVAL" ? "OPERATOR_NOT_PENDING" : "OPERATOR_STATUS_CHANGED",
    );
  }
  if (rule.needsReason && !reason) return fail(422, "REASON_REQUIRED");
  const hasClients = staffState().clients.some((c) => c.operatorId === operator.id);
  if (action === "suspend" && hasClients) return fail(409, "OPERATOR_HAS_CLIENTS");

  operator.status = rule.to;
  operator.reason = rule.needsReason ? reason : undefined;
  setMockAccountState(operator.email, rule.to);
  addAudit({
    actor: MOCK_ADMIN,
    actorRole: "ADMIN",
    action: rule.audit,
    target: operator.name,
    reason: rule.needsReason ? reason : undefined,
  });
  return HttpResponse.json<AdminOperator>(adminOperator(operator));
}

export const adminHandlers = [
  on.get("/admin/overview", async () => {
    await delay();
    const { clients, operators } = staffState();
    const projects = mockProjects();
    const rows = staffPayments(projects);
    const month = recordedThisMonth(rows);
    const overview: AdminOverview = {
      clientCount: clients.length,
      unassignedClientCount: clients.filter((c) => !operatorById(c.operatorId)).length,
      activeOperatorCount: operators.filter((o) => o.status === "ACTIVE").length,
      pendingOperatorCount: operators.filter((o) => o.status === "PENDING_APPROVAL").length,
      projectCount: projects.length,
      activeProjectCount: projects.filter((p) => p.status === "ACTIVE").length,
      changesWaitingForAdmin: projects.flatMap((p) =>
        p.changeRequests.filter((c) => c.status === "UNDER_REVIEW"),
      ).length,
      totals: sumBalances(projects.map(balanceOf)),
      recordedThisMonth: month,
      correctionsThisMonth: rows.filter(
        (row) =>
          row.kind !== "PAYMENT" && localDate(new Date(row.receivedAt)).startsWith(month.month),
      ).length,
      recentActivity: auditLog().slice(0, 5),
    };
    return HttpResponse.json(overview);
  }),

  on.get("/admin/clients", async () => {
    await delay();
    return HttpResponse.json(staffState().clients.map(adminClient));
  }),

  on.post("/admin/clients/{clientId}/assignment", async ({ params, request }) => {
    await delay();
    const client = staffState().clients.find((c) => c.id === params.clientId);
    if (!client) return fail(404, "CLIENT_NOT_FOUND");
    const { operatorId } = await request.json();
    const operator = operatorById(operatorId);
    if (!operator || operator.status !== "ACTIVE") return fail(409, "OPERATOR_NOT_ACTIVE");

    const previous = operatorById(client.operatorId);
    client.operatorId = operator.id;
    for (const project of mockProjects().filter((p) => p.clientId === client.id)) {
      project.operatorName = operator.name;
    }
    addAudit({
      actor: MOCK_ADMIN,
      actorRole: "ADMIN",
      action: "CLIENT_ASSIGNED",
      target: client.name,
      from: previous?.name,
      to: operator.name,
    });
    return HttpResponse.json(adminClient(client));
  }),

  on.get("/admin/projects", async () => {
    await delay();
    return HttpResponse.json(mockProjects().map(adminProject));
  }),

  on.get("/admin/operators", async () => {
    await delay();
    return HttpResponse.json(staffState().operators.map(adminOperator));
  }),

  ...OPERATOR_ACTIONS.map((action) =>
    on.post(`/admin/operators/{operatorId}/${action}`, async ({ params, request }) => {
      await delay();
      return operatorAction(params.operatorId, action, await reasonFrom(request));
    }),
  ),

  on.get("/admin/finance", async () => {
    await delay();
    const projects = mockProjects();
    return HttpResponse.json({
      totals: sumBalances(projects.map(balanceOf)),
      entries: staffPayments(projects),
      // One page holds every demo row.
      nextCursor: null,
    });
  }),

  on.post("/admin/payments/{paymentId}/reversal", async ({ params, request }) => {
    await delay();
    const found = correctable(params.paymentId);
    if (found instanceof Response) return found;
    const reason = await reasonFrom(request);
    if (!reason) return fail(422, "REASON_REQUIRED");
    // Reverses what is left of the payment, so payment + corrections end at zero.
    const row = addCorrection(
      found.project,
      found.row,
      "REVERSAL",
      -netOf(found.project, found.row),
      reason,
    );
    return correctionRow(found.project, row);
  }),

  on.post("/admin/payments/{paymentId}/adjustment", async ({ params, request }) => {
    await delay();
    const found = correctable(params.paymentId);
    if (found instanceof Response) return found;
    const body = await request.json();
    const reason = body.reason.trim();
    if (!Number.isInteger(body.amount) || body.amount === 0) return fail(422, "VALIDATION_FAILED");
    if (!reason) return fail(422, "REASON_REQUIRED");
    // Taking a payment below zero is not an adjustment; that is a reversal.
    if (netOf(found.project, found.row) + body.amount < 0)
      return fail(422, "ADJUSTMENT_BELOW_ZERO");
    const row = addCorrection(found.project, found.row, "ADJUSTMENT", body.amount, reason);
    return correctionRow(found.project, row);
  }),

  on.get("/admin/audit", async ({ request }) => {
    await delay();
    const params = new URL(request.url).searchParams;
    const actor = params.get("actor");
    const action = params.get("action");
    const from = params.get("from");
    const to = params.get("to");
    const all = auditLog();
    const entries = all.filter((entry) => {
      const day = localDate(new Date(entry.at));
      return (
        (!actor || entry.actor === actor) &&
        (!action || entry.action === action) &&
        (!from || day >= from) &&
        (!to || day <= to)
      );
    });
    const actors = [...new Set(all.map((entry) => entry.actor))].sort((a, b) => a.localeCompare(b));
    return HttpResponse.json({ entries, actors, nextCursor: null });
  }),

  on.get("/admin/settings", async () => {
    await delay();
    return HttpResponse.json(staffState().settings);
  }),

  on.put("/admin/settings", async ({ request }) => {
    await delay();
    const next = await request.json();
    const days = next.invitationValidityDays;
    if (
      !next.issuerName?.trim() ||
      !next.issuerAddress?.trim() ||
      !normalizeTzPhone(next.issuerPhone ?? "") ||
      !normalizeTzPhone(next.whatsappNumber ?? "") ||
      !Number.isInteger(days) ||
      days < SETTINGS_LIMITS.invitationDaysMin ||
      days > SETTINGS_LIMITS.invitationDaysMax
    ) {
      return fail(422, "VALIDATION_FAILED");
    }
    const state = staffState();
    const changed = (Object.keys(next) as (keyof typeof next)[]).filter(
      (key) => String(next[key]) !== String(state.settings[key]),
    );
    state.settings = {
      issuerName: next.issuerName.trim(),
      issuerPhone: normalizeTzPhone(next.issuerPhone) ?? next.issuerPhone,
      issuerAddress: next.issuerAddress.trim(),
      whatsappNumber: normalizeTzPhone(next.whatsappNumber) ?? next.whatsappNumber,
      invitationValidityDays: days,
    };
    if (changed.length > 0) {
      addAudit({
        actor: MOCK_ADMIN,
        actorRole: "ADMIN",
        action: "SETTINGS_UPDATED",
        target: changed.join(", "),
      });
    }
    return HttpResponse.json(state.settings);
  }),
];
