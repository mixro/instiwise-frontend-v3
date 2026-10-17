import { api, postJson } from "@/lib/api";
import type { ChangeRequestStatus } from "@/lib/status";

/*
 * Change requests (brief section 10). Served by src/mocks/changes.ts until the
 * backend exists; shapes go into contracts/openapi.yaml in phase 3.1.
 *
 * Rules decided by the product owner (2026-10-17, brief open question 5):
 * - An operator proposes a change. If it changes the price or the deadline, an
 *   admin must approve it before the client sees it; scope-only changes go
 *   straight to the client. Operators never approve their own proposals.
 * - The client accepts or rejects (rejecting needs a reason). Accepting creates
 *   the next agreement version, recorded as accepted by the client; the previous
 *   version is kept as superseded.
 * The server enforces all of this and computes the differences shown here.
 *
 * Error codes: CHANGE_REQUEST_ALREADY_DECIDED, CHANGE_REQUEST_ALREADY_OPEN,
 * CHANGE_REQUEST_NO_CHANGES, AGREEMENT_NOT_ACCEPTED, REASON_REQUIRED.
 */

export interface ChangeTerms {
  scope: string[];
  /** Whole TZS. */
  price: number;
  deadline: string;
}

export interface Decision {
  outcome: "APPROVED" | "ACCEPTED" | "REJECTED";
  by: string;
  at: string;
  reason?: string;
}

export interface ChangeRequest {
  id: string;
  number: string;
  projectId: string;
  projectTitle: string;
  projectReference: string;
  clientName: string;
  title: string;
  /** Why the change is proposed. */
  reason: string;
  createdAt: string;
  createdBy: string;
  status: ChangeRequestStatus;
  /** The accepted agreement when the change was proposed. */
  before: ChangeTerms;
  after: ChangeTerms;
  /** Computed by the server. */
  scopeChanges: { added: string[]; removed: string[]; unchanged: string[] };
  /** after.price - before.price, computed by the server. */
  priceDifference: number;
  needsAdminApproval: boolean;
  adminReview?: Decision;
  clientDecision?: Decision;
  /** The agreement version created when the client accepted. */
  agreementVersion?: number;
}

export interface OperatorProject {
  id: string;
  reference: string;
  title: string;
  clientName: string;
  /** The accepted agreement's terms; absent until the client accepts one. */
  terms?: ChangeTerms;
  openChange: boolean;
}

export interface ProposalBody extends ChangeTerms {
  title: string;
  reason: string;
}

const id = encodeURIComponent;

export const changesApi = {
  client: {
    list: (projectId: string) =>
      api<ChangeRequest[]>(`/client/projects/${id(projectId)}/change-requests`),
    decide: (changeId: string, body: { outcome: "ACCEPT" | "REJECT"; reason?: string }) =>
      postJson<ChangeRequest>(`/client/change-requests/${id(changeId)}/decision`, body),
  },
  operator: {
    projects: () => api<OperatorProject[]>("/operator/projects"),
    project: (projectId: string) => api<OperatorProject>(`/operator/projects/${id(projectId)}`),
    list: (projectId: string) =>
      api<ChangeRequest[]>(`/operator/projects/${id(projectId)}/change-requests`),
    propose: (projectId: string, body: ProposalBody) =>
      postJson<ChangeRequest>(`/operator/projects/${id(projectId)}/change-requests`, body),
  },
  admin: {
    queue: () => api<ChangeRequest[]>("/admin/change-requests?status=UNDER_REVIEW"),
    review: (changeId: string, body: { outcome: "APPROVE" | "REJECT"; reason?: string }) =>
      postJson<ChangeRequest>(`/admin/change-requests/${id(changeId)}/review`, body),
  },
};
