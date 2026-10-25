import { apiClient } from "@/lib/api";
import type { Schema } from "@/lib/contract/types";

/*
 * Creating projects and drafting agreement v1 (contracts/openapi.yaml; decided
 * 2026-10-18 and 2026-10-25).
 * - Admins: any client. Operators: assigned clients only, with the admin-granted
 *   canCreateProjects permission.
 * - A new project and its agreement v1 are DRAFT; the client sees nothing until
 *   the draft is sent. Project fields and the draft change only while DRAFT.
 * - Agreement terms are written in English and Swahili (ADR 0004).
 * Served by src/mocks/projects.ts until the backend exists.
 */

export type StaffRole = "OPERATOR" | "ADMIN";

/** Where each staff role's screens live. */
export const STAFF_BASE: Record<StaffRole, string> = { OPERATOR: "/operator", ADMIN: "/admin" };
export type StaffProjectRecord = Schema<"StaffProjectRecord">;
export type StaffProjectDetail = Schema<"OperatorProject">;
export type AdminProjectDetail = Schema<"AdminProjectDetail">;
export type ProjectCreateBody = Schema<"ProjectCreateRequest">;
export type ProjectUpdate = Schema<"ProjectUpdate">;
export type AgreementDraft = Schema<"AgreementDraft">;

const path = (projectId: string) => ({ path: { projectId } });

export const projectsApi = {
  OPERATOR: {
    create: (body: ProjectCreateBody) => apiClient.POST("/operator/projects", { body }),
    get: (projectId: string): Promise<StaffProjectDetail> =>
      apiClient.GET("/operator/projects/{projectId}", path(projectId)),
    update: (projectId: string, body: ProjectUpdate): Promise<StaffProjectDetail> =>
      apiClient.PATCH("/operator/projects/{projectId}", { ...path(projectId), body }),
    agreement: (projectId: string) =>
      apiClient.GET("/operator/projects/{projectId}/agreement", path(projectId)),
    saveDraft: (projectId: string, body: AgreementDraft) =>
      apiClient.PUT("/operator/projects/{projectId}/agreement/draft", { ...path(projectId), body }),
    send: (projectId: string) =>
      apiClient.POST("/operator/projects/{projectId}/agreement/draft/submission", path(projectId)),
  },
  ADMIN: {
    create: (body: ProjectCreateBody) => apiClient.POST("/admin/projects", { body }),
    get: (projectId: string): Promise<StaffProjectDetail> =>
      apiClient.GET("/admin/projects/{projectId}", path(projectId)),
    update: (projectId: string, body: ProjectUpdate): Promise<StaffProjectDetail> =>
      apiClient.PATCH("/admin/projects/{projectId}", { ...path(projectId), body }),
    agreement: (projectId: string) =>
      apiClient.GET("/admin/projects/{projectId}/agreement", path(projectId)),
    saveDraft: (projectId: string, body: AgreementDraft) =>
      apiClient.PUT("/admin/projects/{projectId}/agreement/draft", { ...path(projectId), body }),
    send: (projectId: string) =>
      apiClient.POST("/admin/projects/{projectId}/agreement/draft/submission", path(projectId)),
  },
} satisfies Record<StaffRole, unknown>;
