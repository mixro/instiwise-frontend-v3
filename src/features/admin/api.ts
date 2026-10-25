import { apiClient } from "@/lib/api";
import type { Operation, QueryOf, Schema } from "@/lib/contract/types";

/*
 * Admin endpoints: system-wide (brief 5.3; contracts/openapi.yaml, tag Admin).
 * Served by src/mocks/admin.ts until the backend exists.
 *
 * Decided by the product owner (2026-10-17):
 * - Corrections (brief open question 8): a reversal or an adjustment is a new row
 *   numbered COR-…, linked to the payment it corrects. The original keeps its RC
 *   number and is marked Reversed or Adjusted. Nothing is edited or deleted. To fix
 *   a wrong payment completely, reverse it and record the right one.
 * - Any admin may correct, with a required reason; it takes effect at once and is
 *   written to the audit log.
 * - An operator with assigned clients cannot be suspended until an admin has
 *   reassigned them, so no client is left without an operator.
 * - Settings in this phase: receipt issuer details, the team WhatsApp number and
 *   how long invitations stay valid.
 */

export type AdminOverview = Schema<"AdminOverview">;
export type AdminClient = Schema<"AdminClient">;
export type AdminProject = Schema<"AdminProject">;
export type AdminOperator = Schema<"AdminOperator">;
export type AdminFinance = Schema<"AdminFinance">;
export type AuditAction = Schema<"AuditAction">;
/** One audit log row. Values are data (names, numbers), never sentences, so the UI can translate. */
export type AuditEntry = Schema<"AuditEntry">;
export type AuditPage = Schema<"AuditPage">;
export type Settings = Schema<"Settings">;

/** Every audit action, in the order the filter lists them. Must name every contract value. */
const AUDIT_ACTION_ORDER: Record<AuditAction, number> = {
  PAYMENT_RECORDED: 0,
  PAYMENT_REVERSED: 1,
  PAYMENT_ADJUSTED: 2,
  EXPENSE_SUBMITTED: 3,
  EXPENSE_APPROVED: 4,
  EXPENSE_REJECTED: 5,
  EXPENSE_WITHDRAWN: 6,
  EXPENSE_REVERSED: 7,
  EXPENSE_ADJUSTED: 8,
  EXPENSE_CATEGORY_CHANGED: 9,
  OPERATOR_APPROVED: 10,
  OPERATOR_REJECTED: 11,
  OPERATOR_SUSPENDED: 12,
  OPERATOR_REACTIVATED: 13,
  OPERATOR_PERMISSIONS_CHANGED: 14,
  CLIENT_ASSIGNED: 15,
  CLIENT_UPDATED: 16,
  INVITATION_CREATED: 17,
  INVITATION_REVOKED: 18,
  PROJECT_CREATED: 19,
  PROJECT_UPDATED: 20,
  AGREEMENT_SENT: 21,
  AGREEMENT_ACCEPTED: 22,
  CHANGE_APPROVED: 23,
  CHANGE_NOT_APPROVED: 24,
  CHANGE_ACCEPTED: 25,
  CHANGE_REJECTED: 26,
  DOCUMENT_UPLOADED: 27,
  DOCUMENT_VISIBILITY_CHANGED: 28,
  CONVERSATION_VIEWED: 29,
  CONVERSATION_LIST_VIEWED: 30,
  PASSWORD_RESET: 31,
  PASSWORD_CHANGED: 32,
  SETTINGS_UPDATED: 33,
};

export const AUDIT_ACTIONS = (Object.keys(AUDIT_ACTION_ORDER) as AuditAction[]).sort(
  (a, b) => AUDIT_ACTION_ORDER[a] - AUDIT_ACTION_ORDER[b],
);

/** The audit log's server-side filters (the contract's query, without paging). */
export type AuditFilters = Omit<QueryOf<Operation<"/admin/audit", "get">>, "cursor" | "limit">;

export const SETTINGS_LIMITS = { invitationDaysMin: 1, invitationDaysMax: 30 } as const;

type OperatorAction = "approve" | "reject" | "suspend" | "reactivate";

const operatorPath = (operatorId: string) => ({ path: { operatorId } });
const paymentPath = (paymentId: string) => ({ path: { paymentId } });

export const adminApi = {
  overview: () => apiClient.GET("/admin/overview"),
  clients: () => apiClient.GET("/admin/clients"),
  assignClient: (clientId: string, operatorId: string) =>
    apiClient.POST("/admin/clients/{clientId}/assignment", {
      path: { clientId },
      body: { operatorId },
    }),
  projects: () => apiClient.GET("/admin/projects"),
  operators: () => apiClient.GET("/admin/operators"),
  /** Reject and suspend need a reason (the server answers REASON_REQUIRED without one). */
  operatorAction: (operatorId: string, action: OperatorAction, reason?: string) => {
    const path = operatorPath(operatorId);
    const required = { ...path, body: { reason: reason ?? "" } };
    const optional = { ...path, body: reason ? { reason } : {} };
    switch (action) {
      case "approve":
        return apiClient.POST("/admin/operators/{operatorId}/approve", optional);
      case "reject":
        return apiClient.POST("/admin/operators/{operatorId}/reject", required);
      case "suspend":
        return apiClient.POST("/admin/operators/{operatorId}/suspend", required);
      case "reactivate":
        return apiClient.POST("/admin/operators/{operatorId}/reactivate", optional);
    }
  },
  finance: () => apiClient.GET("/admin/finance"),
  reverse: (paymentId: string, reason: string) =>
    apiClient.POST("/admin/payments/{paymentId}/reversal", {
      ...paymentPath(paymentId),
      body: { reason },
    }),
  adjust: (paymentId: string, amount: number, reason: string) =>
    apiClient.POST("/admin/payments/{paymentId}/adjustment", {
      ...paymentPath(paymentId),
      body: { amount, reason },
    }),
  audit: (filters: AuditFilters) => apiClient.GET("/admin/audit", { query: filters }),
  settings: () => apiClient.GET("/admin/settings"),
  saveSettings: (settings: Settings) => apiClient.PUT("/admin/settings", { body: settings }),
};
