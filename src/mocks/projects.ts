import { delay, HttpResponse } from "msw";
import type { AgreementVersion } from "@/features/client/api";
import type {
  AdminProjectDetail,
  AgreementDraft,
  ProjectCreateBody,
  ProjectUpdate,
  StaffProjectRecord,
} from "@/features/projects/api";
import type { Role } from "@/lib/roles";
import { addAudit, MOCK_ADMIN, operatorById, staffState } from "./admin-store";
import { operatorProject } from "./changes";
import { mockProjects, type MockProject } from "./client";
import { fail, on } from "./contract";
import { assignedClients, assignedProjects } from "./operator";
import { MOCK_OPERATOR, MOCK_OPERATOR_ID } from "./staff-seed";

/*
 * Creating projects and drafting agreement v1 (decided 2026-10-18 and 2026-10-25),
 * enforced as the server will:
 * - admins: any client; operators: only assigned clients, and only with the
 *   admin-granted canCreateProjects permission (403 PERMISSION_REQUIRED);
 * - a new project and its agreement v1 are DRAFT; clients see neither (the
 *   client mocks skip DRAFT projects and versions);
 * - project fields and the draft can change only while DRAFT; sending makes the
 *   version AWAITING_ACCEPTANCE and the project AWAITING_CLIENT_ACCEPTANCE, and
 *   from then on it is history (409);
 * - every agreement term is written in English and Swahili.
 */

const DATE = /^\d{4}-\d{2}-\d{2}$/;

const operatorMayCreate = () => operatorById(MOCK_OPERATOR_ID)?.permissions.canCreateProjects;

/** Whole TZS, a date, and every term in both languages. */
function validDraft(draft: AgreementDraft): boolean {
  const terms = [...draft.scope, ...draft.exclusions, ...draft.paymentTerms];
  return (
    Number.isInteger(draft.price) &&
    draft.price >= 0 &&
    DATE.test(draft.deadline) &&
    draft.scope.length > 0 &&
    terms.every((term) => term.en.trim() && term.sw.trim() && term.en.length <= 300)
  );
}

function validFields(fields: ProjectUpdate): boolean {
  const { title, category, description, deliverables, startDate } = fields;
  return (
    (title === undefined || (title.trim().length >= 3 && title.length <= 120)) &&
    (category === undefined || (category.trim().length >= 2 && category.length <= 60)) &&
    (description === undefined || description.length <= 2000) &&
    (deliverables === undefined || deliverables.every((item) => item.trim())) &&
    (startDate === undefined || DATE.test(startDate))
  );
}

const trimTerms = (draft: AgreementDraft) => ({
  price: draft.price,
  deadline: draft.deadline,
  scope: draft.scope.map(({ en, sw }) => ({ en: en.trim(), sw: sw.trim() })),
  exclusions: draft.exclusions.map(({ en, sw }) => ({ en: en.trim(), sw: sw.trim() })),
  paymentTerms: draft.paymentTerms.map(({ en, sw }) => ({ en: en.trim(), sw: sw.trim() })),
});

function nextReference(): string {
  const highest = Math.max(
    0,
    ...mockProjects().map((project) => Number(project.reference.slice(-3)) || 0),
  );
  return `PRJ-2026-${String(highest + 1).padStart(3, "0")}`;
}

/** The newest version: version 1 while the project is a draft. */
const latest = (project: MockProject): AgreementVersion | undefined => project.agreements[0];

function record(project: MockProject): StaffProjectRecord {
  const agreement = latest(project);
  if (!agreement) throw new Error(`Project ${project.id} has no agreement`);
  return {
    id: project.id,
    reference: project.reference,
    title: project.title,
    status: project.status,
    clientId: project.clientId,
    clientName: project.clientName,
    category: project.category,
    description: project.description,
    deliverables: project.deliverables,
    startDate: project.startDate,
    agreement,
  };
}

function adminDetail(project: MockProject): AdminProjectDetail {
  const client = staffState().clients.find((c) => c.id === project.clientId);
  return {
    ...operatorProject(project),
    operatorName: operatorById(client?.operatorId)?.name ?? null,
  };
}

function create(body: ProjectCreateBody, actor: { name: string; role: Role }) {
  const client = staffState().clients.find((c) => c.id === body.clientId);
  if (!client) return fail(404, "CLIENT_NOT_FOUND");
  if (!validFields(body) || !body.title || !body.category || !validDraft(body.agreement)) {
    return fail(422, "VALIDATION_FAILED");
  }
  const now = new Date().toISOString();
  const project: MockProject = {
    id: `prj_${Date.now()}`,
    clientId: client.id,
    clientName: client.name,
    operatorName: operatorById(client.operatorId)?.name ?? "",
    reference: nextReference(),
    title: body.title.trim(),
    status: "DRAFT",
    category: body.category.trim(),
    description: body.description.trim(),
    deliverables: body.deliverables.map((item) => item.trim()),
    startDate: body.startDate,
    deadline: body.agreement.deadline,
    agreements: [{ version: 1, status: "DRAFT", createdAt: now, ...trimTerms(body.agreement) }],
    progress: [],
    messages: [],
    payments: [],
    documents: [],
    changeRequests: [],
  };
  mockProjects().push(project);
  addAudit({
    actor: actor.name,
    actorRole: actor.role,
    action: "PROJECT_CREATED",
    target: project.reference,
    to: client.name,
  });
  return HttpResponse.json<StaffProjectRecord>(record(project), { status: 201 });
}

function update(project: MockProject, body: ProjectUpdate, actor: { name: string; role: Role }) {
  if (project.status !== "DRAFT") return fail(409, "PROJECT_NOT_DRAFT");
  if (Object.keys(body).length === 0 || !validFields(body)) return fail(422, "VALIDATION_FAILED");
  if (body.title !== undefined) project.title = body.title.trim();
  if (body.category !== undefined) project.category = body.category.trim();
  if (body.description !== undefined) project.description = body.description.trim();
  if (body.deliverables !== undefined)
    project.deliverables = body.deliverables.map((d) => d.trim());
  if (body.startDate !== undefined) project.startDate = body.startDate;
  addAudit({
    actor: actor.name,
    actorRole: actor.role,
    action: "PROJECT_UPDATED",
    target: project.reference,
  });
  return null;
}

function saveDraft(project: MockProject, draft: AgreementDraft) {
  const version = latest(project);
  if (!version || version.status !== "DRAFT") return fail(409, "AGREEMENT_NOT_DRAFT");
  if (!validDraft(draft)) return fail(422, "VALIDATION_FAILED");
  Object.assign(version, trimTerms(draft));
  project.deadline = draft.deadline;
  return HttpResponse.json<AgreementVersion>(version);
}

function submit(project: MockProject, actor: { name: string; role: Role }) {
  const version = latest(project);
  if (!version || version.status !== "DRAFT") return fail(409, "AGREEMENT_NOT_DRAFT");
  version.status = "AWAITING_ACCEPTANCE";
  version.createdAt = new Date().toISOString();
  project.status = "AWAITING_CLIENT_ACCEPTANCE";
  addAudit({
    actor: actor.name,
    actorRole: actor.role,
    action: "AGREEMENT_SENT",
    target: `${project.reference} v${version.version}`,
    to: project.clientName,
  });
  return HttpResponse.json<AgreementVersion>(version);
}

const OPERATOR_ACTOR = { name: MOCK_OPERATOR, role: "OPERATOR" as const };
const ADMIN_ACTOR = { name: MOCK_ADMIN, role: "ADMIN" as const };

const operatorProjectById = (projectId: string) =>
  assignedProjects().find((project) => project.id === projectId);
const anyProject = (projectId: string) =>
  mockProjects().find((project) => project.id === projectId);

/** Newest version first, drafts included (staff only). */
const versionsOf = (project: MockProject) => ({ versions: project.agreements });

export const projectHandlers = [
  // ----- operator (assigned clients only; creating and drafting need the permission)
  on.post("/operator/projects", async ({ request }) => {
    await delay();
    if (!operatorMayCreate()) return fail(403, "PERMISSION_REQUIRED");
    const body = await request.json();
    // Someone else's client answers as if it did not exist.
    if (!assignedClients().some((client) => client.id === body.clientId)) {
      return fail(404, "CLIENT_NOT_FOUND");
    }
    return create(body, OPERATOR_ACTOR);
  }),

  on.patch("/operator/projects/{projectId}", async ({ params, request }) => {
    await delay();
    if (!operatorMayCreate()) return fail(403, "PERMISSION_REQUIRED");
    const project = operatorProjectById(params.projectId);
    if (!project) return fail(404, "PROJECT_NOT_FOUND");
    const refused = update(project, await request.json(), OPERATOR_ACTOR);
    return refused ?? HttpResponse.json(operatorProject(project));
  }),

  on.get("/operator/projects/{projectId}/agreement", async ({ params }) => {
    await delay();
    const project = operatorProjectById(params.projectId);
    return project ? HttpResponse.json(versionsOf(project)) : fail(404, "PROJECT_NOT_FOUND");
  }),

  on.put("/operator/projects/{projectId}/agreement/draft", async ({ params, request }) => {
    await delay();
    if (!operatorMayCreate()) return fail(403, "PERMISSION_REQUIRED");
    const project = operatorProjectById(params.projectId);
    if (!project) return fail(404, "PROJECT_NOT_FOUND");
    return saveDraft(project, await request.json());
  }),

  on.post("/operator/projects/{projectId}/agreement/draft/submission", async ({ params }) => {
    await delay();
    if (!operatorMayCreate()) return fail(403, "PERMISSION_REQUIRED");
    const project = operatorProjectById(params.projectId);
    if (!project) return fail(404, "PROJECT_NOT_FOUND");
    return submit(project, OPERATOR_ACTOR);
  }),

  // ----- admin (any client)
  on.post("/admin/projects", async ({ request }) => {
    await delay();
    return create(await request.json(), ADMIN_ACTOR);
  }),

  on.get("/admin/projects/{projectId}", async ({ params }) => {
    await delay();
    const project = anyProject(params.projectId);
    return project ? HttpResponse.json(adminDetail(project)) : fail(404, "PROJECT_NOT_FOUND");
  }),

  on.patch("/admin/projects/{projectId}", async ({ params, request }) => {
    await delay();
    const project = anyProject(params.projectId);
    if (!project) return fail(404, "PROJECT_NOT_FOUND");
    const refused = update(project, await request.json(), ADMIN_ACTOR);
    return refused ?? HttpResponse.json(adminDetail(project));
  }),

  on.get("/admin/projects/{projectId}/agreement", async ({ params }) => {
    await delay();
    const project = anyProject(params.projectId);
    return project ? HttpResponse.json(versionsOf(project)) : fail(404, "PROJECT_NOT_FOUND");
  }),

  on.put("/admin/projects/{projectId}/agreement/draft", async ({ params, request }) => {
    await delay();
    const project = anyProject(params.projectId);
    if (!project) return fail(404, "PROJECT_NOT_FOUND");
    return saveDraft(project, await request.json());
  }),

  on.post("/admin/projects/{projectId}/agreement/draft/submission", async ({ params }) => {
    await delay();
    const project = anyProject(params.projectId);
    if (!project) return fail(404, "PROJECT_NOT_FOUND");
    return submit(project, ADMIN_ACTOR);
  }),
];
