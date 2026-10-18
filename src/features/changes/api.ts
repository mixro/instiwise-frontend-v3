import { apiClient } from "@/lib/api";
import type { Schema } from "@/lib/contract/types";

/*
 * Change requests (brief section 10; contracts/openapi.yaml, tag Changes).
 * Served by src/mocks/changes.ts until the backend exists.
 *
 * Rules decided by the product owner (2026-10-17, brief open question 5):
 * - An operator proposes a change. If it changes the price or the deadline, an
 *   admin must approve it before the client sees it; scope-only changes go
 *   straight to the client. Operators never approve their own proposals.
 * - The client accepts or rejects (rejecting needs a reason). Accepting creates
 *   the next agreement version, recorded as accepted by the client; the previous
 *   version is kept as superseded.
 * The server enforces all of this and computes the differences shown here.
 */

export type ChangeTerms = Schema<"ChangeTerms">;
export type Decision = Schema<"Decision">;
export type ChangeRequest = Schema<"ChangeRequest">;
export type OperatorProject = Schema<"OperatorProject">;
export type ProposalBody = Schema<"ProposalRequest">;
export type ClientDecisionBody = Schema<"ClientDecisionRequest">;
export type AdminReviewBody = Schema<"AdminReviewRequest">;

const project = (projectId: string) => ({ path: { projectId } });
const change = (changeRequestId: string) => ({ path: { changeRequestId } });

export const changesApi = {
  client: {
    list: (projectId: string) =>
      apiClient.GET("/client/projects/{projectId}/change-requests", project(projectId)),
    decide: (changeId: string, body: ClientDecisionBody) =>
      apiClient.POST("/client/change-requests/{changeRequestId}/decision", {
        ...change(changeId),
        body,
      }),
  },
  operator: {
    projects: () => apiClient.GET("/operator/projects"),
    project: (projectId: string) =>
      apiClient.GET("/operator/projects/{projectId}", project(projectId)),
    list: (projectId: string) =>
      apiClient.GET("/operator/projects/{projectId}/change-requests", project(projectId)),
    propose: (projectId: string, body: ProposalBody) =>
      apiClient.POST("/operator/projects/{projectId}/change-requests", {
        ...project(projectId),
        body,
      }),
  },
  admin: {
    queue: () => apiClient.GET("/admin/change-requests", { query: { status: "UNDER_REVIEW" } }),
    review: (changeId: string, body: AdminReviewBody) =>
      apiClient.POST("/admin/change-requests/{changeRequestId}/review", {
        ...change(changeId),
        body,
      }),
  },
};
