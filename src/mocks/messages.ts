import { delay, HttpResponse } from "msw";
import type { ConversationSummary } from "@/features/messages/api";
import { addAudit, MOCK_ADMIN, operatorById, staffState } from "./admin-store";
import { mockProjects, toMessage, type MockMessage, type MockProject } from "./client";
import { fail, on } from "./contract";
import { assignedProjects, clientNameOf } from "./operator";

/*
 * Staff messaging (decided 2026-10-18 and 2026-10-21), as the server will do it:
 * - operators read and reply only in projects of their assigned clients; any
 *   other project answers 404, and the inbox never lists it;
 * - admins read every conversation, read-only; every list view and every
 *   conversation they open is written to the audit log;
 * - unread for staff means client messages the operator has not read.
 * A reply is stored on the same project as the client's messages, so the client
 * sees it on their Messages tab (unread until they open it).
 */

const PREVIEW_MAX = 140;
const SEARCH_MAX = 100;

const unreadByOperator = (project: MockProject) =>
  project.messages.filter((m) => m.senderRole === "CLIENT" && !m.readByOperator).length;

const lastOf = (project: MockProject): MockMessage | undefined =>
  [...project.messages].sort((a, b) => a.sentAt.localeCompare(b.sentAt)).at(-1);

function operatorIdOf(project: MockProject): string | null {
  return staffState().clients.find((c) => c.id === project.clientId)?.operatorId ?? null;
}

function summary(project: MockProject, forAdmin: boolean): ConversationSummary {
  const client = staffState().clients.find((c) => c.id === project.clientId);
  const last = lastOf(project);
  return {
    projectId: project.id,
    projectReference: project.reference,
    projectTitle: project.title,
    clientId: project.clientId,
    clientName: clientNameOf(project),
    clientPhone: client?.phone,
    operatorName: forAdmin ? (operatorById(client?.operatorId)?.name ?? null) : undefined,
    lastMessage: last
      ? {
          preview: last.body.slice(0, PREVIEW_MAX),
          sentAt: last.sentAt,
          senderName: last.senderName,
          senderRole: last.senderRole,
        }
      : null,
    unreadCount: unreadByOperator(project),
  };
}

/** Newest activity first; projects nobody has written in yet last. */
const byActivity = (a: ConversationSummary, b: ConversationSummary) =>
  (b.lastMessage?.sentAt ?? "").localeCompare(a.lastMessage?.sentAt ?? "");

/** Filters from the query string, or null when they are not valid. */
function readFilters(url: string) {
  const query = new URL(url).searchParams;
  const unread = query.get("unread");
  const q = query.get("q")?.trim().toLowerCase() ?? "";
  if ((unread !== null && unread !== "true" && unread !== "false") || q.length > SEARCH_MAX) {
    return null;
  }
  return { unread: unread === "true", q, operatorId: query.get("operatorId") };
}

function page(projects: MockProject[], url: string, forAdmin: boolean) {
  const filters = readFilters(url);
  if (!filters) return null;
  const all = projects.map((project) => summary(project, forAdmin));
  const items = all
    .filter((c) => !filters.unread || c.unreadCount > 0)
    .filter(
      (c) =>
        !filters.q ||
        [c.clientName, c.projectTitle, c.projectReference].some((text) =>
          text.toLowerCase().includes(filters.q),
        ),
    )
    .filter((c) => {
      if (!forAdmin || !filters.operatorId) return true;
      const project = projects.find((p) => p.id === c.projectId);
      return project ? operatorIdOf(project) === filters.operatorId : false;
    })
    .sort(byActivity);
  return {
    // One page holds every demo conversation.
    items,
    nextCursor: null,
    unreadTotal: all.filter((c) => c.unreadCount > 0).length,
  };
}

/** The mock operator's own scope; anything else is "not found". */
const operatorProject = (projectId: string) =>
  assignedProjects().find((project) => project.id === projectId);

export const messageHandlers = [
  on.get("/operator/conversations", async ({ request }) => {
    await delay();
    const result = page(assignedProjects(), request.url, false);
    return result ? HttpResponse.json(result) : fail(422, "VALIDATION_FAILED");
  }),

  on.get("/operator/projects/{projectId}/messages", async ({ params }) => {
    await delay();
    const project = operatorProject(params.projectId);
    if (!project) return fail(404, "PROJECT_NOT_FOUND");
    return HttpResponse.json({
      items: project.messages.map((m) => toMessage(m, "OPERATOR")),
      nextCursor: null,
    });
  }),

  on.post("/operator/projects/{projectId}/messages", async ({ params, request }) => {
    await delay();
    const project = operatorProject(params.projectId);
    if (!project) return fail(404, "PROJECT_NOT_FOUND");
    const { body } = await request.json();
    const text = body.trim();
    if (!text || text.length > 2000) return fail(422, "VALIDATION_FAILED");
    // Same demo failure as the client side, to show the retry.
    if (text.includes("[fail]")) return fail(500, "INTERNAL_ERROR");
    const sent: MockMessage = {
      id: `m_${Date.now()}`,
      body: text,
      sentAt: new Date().toISOString(),
      senderName: project.operatorName,
      senderRole: "OPERATOR",
      // Unread for the client until they open the conversation.
      read: false,
      readByOperator: true,
    };
    project.messages.push(sent);
    return HttpResponse.json(toMessage(sent, "OPERATOR"), { status: 201 });
  }),

  on.post("/operator/projects/{projectId}/messages/read", async ({ params }) => {
    const project = operatorProject(params.projectId);
    if (!project) return fail(404, "PROJECT_NOT_FOUND");
    for (const m of project.messages) m.readByOperator = true;
    return HttpResponse.json({ ok: true });
  }),

  on.get("/admin/conversations", async ({ request }) => {
    await delay();
    const result = page(mockProjects(), request.url, true);
    if (!result) return fail(422, "VALIDATION_FAILED");
    // Previews are message content: every list view is recorded.
    addAudit({
      actor: MOCK_ADMIN,
      actorRole: "ADMIN",
      action: "CONVERSATION_LIST_VIEWED",
      target: "conversations",
    });
    return HttpResponse.json(result);
  }),

  on.get("/admin/projects/{projectId}/messages", async ({ params }) => {
    await delay();
    const project = mockProjects().find((p) => p.id === params.projectId);
    if (!project) return fail(404, "PROJECT_NOT_FOUND");
    addAudit({
      actor: MOCK_ADMIN,
      actorRole: "ADMIN",
      action: "CONVERSATION_VIEWED",
      target: project.reference,
    });
    // Reading as admin marks nothing as read, for the client or the operator.
    return HttpResponse.json({
      items: project.messages.map((m) => toMessage(m, "ADMIN")),
      nextCursor: null,
    });
  }),
];
