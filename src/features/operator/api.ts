import { apiClient } from "@/lib/api";
import type { Schema } from "@/lib/contract/types";

/*
 * The operator's view (contracts/openapi.yaml, tag Operator). Every endpoint is
 * scoped by the server to the clients assigned to the signed-in operator
 * (ADR 0002): unassigned clients never appear, not even inside totals, and asking
 * for one directly answers 404 (as if it did not exist). Served by
 * src/mocks/operator.ts until the backend exists.
 *
 * Decided 2026-10-17:
 * - Dashboard money: agreed, collected and outstanding over the assigned clients'
 *   accepted agreements (all time), plus payments recorded this calendar month
 *   (Dar es Salaam time).
 * - Recording a payment: whole TZS; a reference is required for bank transfer
 *   and mobile money, optional for cash; the payment date is today or up to 30
 *   days back, never in the future.
 */

export type OperatorDashboard = Schema<"OperatorDashboard">;
export type ClientSummary = Schema<"ClientSummary">;
export type StaffProject = Schema<"StaffProject">;
export type ClientDetail = Schema<"ClientDetail">;
/** A payment or correction row as staff see it. */
export type StaffPayment = Schema<"StaffPayment">;
export type StaffPaymentPage = Schema<"StaffPaymentPage">;
export type PaymentDraft = Schema<"PaymentDraft">;
/** What recording would do, computed by the server before anything is saved. */
export type PaymentPreview = Schema<"PaymentPreview">;

export const operatorApi = {
  dashboard: () => apiClient.GET("/operator/dashboard"),
  clients: () => apiClient.GET("/operator/clients"),
  client: (clientId: string) =>
    apiClient.GET("/operator/clients/{clientId}", { path: { clientId } }),
  payments: () => apiClient.GET("/operator/payments"),
  previewPayment: (draft: PaymentDraft) =>
    apiClient.POST("/operator/payments/preview", { body: draft }),
  recordPayment: (draft: PaymentDraft) => apiClient.POST("/operator/payments", { body: draft }),
  receipt: (receiptNumber: string) =>
    apiClient.GET("/operator/receipts/{receiptNumber}", { path: { receiptNumber } }),
};
