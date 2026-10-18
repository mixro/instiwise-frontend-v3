import { delay, HttpResponse } from "msw";
import type { ChangeRequest, ChangeTerms, OperatorProject } from "@/features/changes/api";
import {
  acceptedAgreement,
  MOCK_CLIENT_ID,
  mockClientName,
  mockProjects,
  type MockProject,
} from "./client";
import { addAudit } from "./admin-store";
import { fail, on } from "./contract";

/*
 * Change-request rules, enforced here as the real server will (decided 2026-10-17):
 * - price or deadline changed -> UNDER_REVIEW (an admin approves first);
 *   scope only -> straight to AWAITING_CLIENT_ACCEPTANCE.
 * - one open change per project; a decided change cannot be decided again.
 * - rejecting needs a reason; accepting creates the next agreement version,
 *   recorded as accepted by the client, and supersedes the previous one.
 * The mock does not check who is signed in: client, operator (Baraka Mushi) and
 * admin (Rehema Said) endpoints each assume their demo person.
 */

export interface ChangeRecord {
  id: string;
  number: string;
  title: string;
  reason: string;
  createdAt: string;
  createdBy: string;
  status: ChangeRequest["status"];
  before: ChangeTerms;
  after: ChangeTerms;
  needsAdminApproval: boolean;
  adminReview?: ChangeRequest["adminReview"];
  clientDecision?: ChangeRequest["clientDecision"];
  agreementVersion?: number;
}

const OPERATOR = "Baraka Mushi";
const ADMIN = "Rehema Said";
const OPEN = new Set(["UNDER_REVIEW", "AWAITING_CLIENT_ACCEPTANCE"]);

/** The record as the API returns it, with the differences computed. */
function present(project: MockProject, record: ChangeRecord): ChangeRequest {
  const before = new Set(record.before.scope);
  const after = new Set(record.after.scope);
  return {
    ...record,
    projectId: project.id,
    projectTitle: project.title,
    projectReference: project.reference,
    clientName: project.clientName,
    scopeChanges: {
      added: record.after.scope.filter((item) => !before.has(item)),
      removed: record.before.scope.filter((item) => !after.has(item)),
      unchanged: record.after.scope.filter((item) => before.has(item)),
    },
    priceDifference: record.after.price - record.before.price,
  };
}

function findChange(id: unknown, inProjects: MockProject[]) {
  for (const project of inProjects) {
    const record = project.changeRequests.find((change) => change.id === id);
    if (record) return { project, record };
  }
  return undefined;
}

const clientProjects = () => mockProjects().filter((p) => p.clientId === MOCK_CLIENT_ID);
const operatorProjects = () => mockProjects().filter((p) => p.operatorName === OPERATOR);

/** What the client may see: nothing the admin has not let through. */
function visibleToClient(record: ChangeRecord): boolean {
  return record.status !== "UNDER_REVIEW" && record.adminReview?.outcome !== "REJECTED";
}

function termsOf(project: MockProject): ChangeTerms | undefined {
  const agreement = acceptedAgreement(project);
  return agreement
    ? { scope: agreement.scope, price: agreement.price, deadline: agreement.deadline }
    : undefined;
}

function operatorProject(project: MockProject): OperatorProject {
  return {
    id: project.id,
    reference: project.reference,
    title: project.title,
    clientName: project.clientName,
    terms: termsOf(project),
    openChange: project.changeRequests.some((change) => OPEN.has(change.status)),
  };
}

function nextNumber(): string {
  const count = mockProjects().reduce((sum, p) => sum + p.changeRequests.length, 0);
  return `CR-2026-${String(count + 1).padStart(4, "0")}`;
}

function sameScope(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((item, index) => item === b[index]);
}

/** Client acceptance: the next agreement version, accepted, superseding the current one. */
function applyChange(project: MockProject, record: ChangeRecord, now: string): number {
  const current = acceptedAgreement(project);
  const version = Math.max(0, ...project.agreements.map((a) => a.version)) + 1;
  if (current) current.status = "SUPERSEDED";
  project.agreements.unshift({
    version,
    status: "ACCEPTED",
    createdAt: now,
    acceptedAt: now,
    acceptedBy: mockClientName(),
    price: record.after.price,
    deadline: record.after.deadline,
    scope: record.after.scope,
    exclusions: current?.exclusions ?? [],
    paymentTerms: current?.paymentTerms ?? [],
  });
  project.deadline = record.after.deadline;
  return version;
}

export const changeHandlers = [
  // ----- client -----
  on.get("/client/projects/{projectId}/change-requests", async ({ params }) => {
    await delay();
    const project = clientProjects().find((p) => p.id === params.projectId);
    if (!project) return fail(404, "PROJECT_NOT_FOUND");
    return HttpResponse.json(
      project.changeRequests.filter(visibleToClient).map((record) => present(project, record)),
    );
  }),

  on.post("/client/change-requests/{changeRequestId}/decision", async ({ params, request }) => {
    await delay();
    const found = findChange(params.changeRequestId, clientProjects());
    if (!found || !visibleToClient(found.record)) return fail(404, "CHANGE_REQUEST_NOT_FOUND");
    const { project, record } = found;
    if (record.status !== "AWAITING_CLIENT_ACCEPTANCE") {
      return fail(409, "CHANGE_REQUEST_ALREADY_DECIDED");
    }
    const body = await request.json();
    const reason = body.reason?.trim();
    if (body.outcome === "REJECT" && !reason) return fail(422, "REASON_REQUIRED");

    const now = new Date().toISOString();
    if (body.outcome === "ACCEPT") {
      record.status = "ACCEPTED";
      record.clientDecision = { outcome: "ACCEPTED", by: mockClientName(), at: now };
      addAudit({
        actor: mockClientName(),
        actorRole: "CLIENT",
        action: "CHANGE_ACCEPTED",
        target: record.number,
        at: now,
      });
      record.agreementVersion = applyChange(project, record, now);
    } else {
      record.status = "REJECTED";
      record.clientDecision = { outcome: "REJECTED", by: mockClientName(), at: now, reason };
      addAudit({
        actor: mockClientName(),
        actorRole: "CLIENT",
        action: "CHANGE_REJECTED",
        target: record.number,
        reason,
        at: now,
      });
    }
    return HttpResponse.json(present(project, record));
  }),

  // ----- operator (assigned projects only) -----
  on.get("/operator/projects", async () => {
    await delay();
    return HttpResponse.json(operatorProjects().map(operatorProject));
  }),

  on.get("/operator/projects/{projectId}", async ({ params }) => {
    await delay();
    const project = operatorProjects().find((p) => p.id === params.projectId);
    if (!project) return fail(404, "PROJECT_NOT_FOUND");
    return HttpResponse.json(operatorProject(project));
  }),

  on.get("/operator/projects/{projectId}/change-requests", async ({ params }) => {
    await delay();
    const project = operatorProjects().find((p) => p.id === params.projectId);
    if (!project) return fail(404, "PROJECT_NOT_FOUND");
    return HttpResponse.json(project.changeRequests.map((record) => present(project, record)));
  }),

  on.post("/operator/projects/{projectId}/change-requests", async ({ params, request }) => {
    await delay();
    const project = operatorProjects().find((p) => p.id === params.projectId);
    if (!project) return fail(404, "PROJECT_NOT_FOUND");
    const before = termsOf(project);
    if (!before) return fail(409, "AGREEMENT_NOT_ACCEPTED");
    if (project.changeRequests.some((change) => OPEN.has(change.status))) {
      return fail(409, "CHANGE_REQUEST_ALREADY_OPEN");
    }

    const body = await request.json();
    const after: ChangeTerms = {
      scope: body.scope.map((item) => item.trim()).filter(Boolean),
      price: body.price,
      deadline: body.deadline,
    };
    if (!Number.isInteger(after.price) || after.price < 0 || after.scope.length === 0) {
      return fail(422, "VALIDATION_FAILED");
    }
    const moneyOrDate = after.price !== before.price || after.deadline !== before.deadline;
    if (!moneyOrDate && sameScope(after.scope, before.scope)) {
      return fail(422, "CHANGE_REQUEST_NO_CHANGES");
    }

    const record: ChangeRecord = {
      id: `chg_${Date.now()}`,
      number: nextNumber(),
      title: body.title.trim(),
      reason: body.reason.trim(),
      createdAt: new Date().toISOString(),
      createdBy: OPERATOR,
      status: moneyOrDate ? "UNDER_REVIEW" : "AWAITING_CLIENT_ACCEPTANCE",
      before,
      after,
      needsAdminApproval: moneyOrDate,
    };
    project.changeRequests.unshift(record);
    return HttpResponse.json(present(project, record), { status: 201 });
  }),

  // ----- admin -----
  on.get("/admin/change-requests", async () => {
    await delay();
    const queue = mockProjects().flatMap((project) =>
      project.changeRequests
        .filter((change) => change.status === "UNDER_REVIEW")
        .map((record) => present(project, record)),
    );
    return HttpResponse.json(queue);
  }),

  on.post("/admin/change-requests/{changeRequestId}/review", async ({ params, request }) => {
    await delay();
    const found = findChange(params.changeRequestId, mockProjects());
    if (!found) return fail(404, "CHANGE_REQUEST_NOT_FOUND");
    const { project, record } = found;
    if (record.status !== "UNDER_REVIEW") return fail(409, "CHANGE_REQUEST_ALREADY_DECIDED");
    const body = await request.json();
    const reason = body.reason?.trim();
    if (body.outcome === "REJECT" && !reason) return fail(422, "REASON_REQUIRED");

    const at = new Date().toISOString();
    if (body.outcome === "APPROVE") {
      record.status = "AWAITING_CLIENT_ACCEPTANCE";
      record.adminReview = { outcome: "APPROVED", by: ADMIN, at };
      addAudit({
        actor: ADMIN,
        actorRole: "ADMIN",
        action: "CHANGE_APPROVED",
        target: record.number,
        at,
      });
    } else {
      record.status = "REJECTED";
      record.adminReview = { outcome: "REJECTED", by: ADMIN, at, reason };
      addAudit({
        actor: ADMIN,
        actorRole: "ADMIN",
        action: "CHANGE_NOT_APPROVED",
        target: record.number,
        reason,
        at,
      });
    }
    return HttpResponse.json(present(project, record));
  }),
];
