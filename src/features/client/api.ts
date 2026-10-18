import { apiClient } from "@/lib/api";
import type { Schema } from "@/lib/contract/types";

/*
 * The client's own data (contracts/openapi.yaml, tag Client). The server scopes
 * every endpoint to the signed-in client and computes every total and balance;
 * the screens only show them. Money is whole TZS. Served by src/mocks/client.ts
 * until the backend exists.
 */

export type PaymentMethod = Schema<"PaymentMethod">;
/** A recorded payment, or a correction row linked to one (never an edit). */
export type PaymentKind = Schema<"PaymentKind">;
/** Totals for one project or for all of a client's projects, as the server computed them. */
export type Balance = Schema<"Balance">;
export type ProjectSummary = Schema<"ProjectSummary">;
export type ProjectDetail = Schema<"ProjectDetail">;
export type Person = ProjectDetail["operator"];
export type ProgressUpdate = Schema<"ProgressUpdate">;
export type HomeSummary = Schema<"HomeSummary">;
export type AgreementVersion = Schema<"AgreementVersion">;
export type Agreement = Schema<"Agreement">;
export type Message = Schema<"Message">;
export type MessagePage = Schema<"MessagePage">;
export type Payment = Schema<"Payment">;
export type PaymentsOverview = Schema<"PaymentsOverview">;
export type Receipt = Schema<"Receipt">;
export type ReceiptCorrection = Schema<"ReceiptCorrection">;
export type DocumentKind = Schema<"DocumentKind">;
export type ProjectDocument = Schema<"ProjectDocument">;
export type Profile = Schema<"Profile">;
export type ProfileUpdate = Schema<"ProfileUpdate">;

const path = (projectId: string) => ({ path: { projectId } });

export const clientApi = {
  home: () => apiClient.GET("/client/home"),
  projects: () => apiClient.GET("/client/projects"),
  project: (id: string) => apiClient.GET("/client/projects/{projectId}", path(id)),
  agreement: (id: string) => apiClient.GET("/client/projects/{projectId}/agreement", path(id)),
  acceptAgreement: (id: string, version: number) =>
    apiClient.POST("/client/projects/{projectId}/agreement/versions/{version}/acceptance", {
      path: { projectId: id, version },
    }),
  progress: (id: string) => apiClient.GET("/client/projects/{projectId}/progress", path(id)),
  messages: (id: string) => apiClient.GET("/client/projects/{projectId}/messages", path(id)),
  sendMessage: (id: string, body: string) =>
    apiClient.POST("/client/projects/{projectId}/messages", { ...path(id), body: { body } }),
  markMessagesRead: (id: string) =>
    apiClient.POST("/client/projects/{projectId}/messages/read", path(id)),
  projectPayments: (id: string) => apiClient.GET("/client/projects/{projectId}/payments", path(id)),
  payments: () => apiClient.GET("/client/payments"),
  receipt: (receiptNumber: string) =>
    apiClient.GET("/client/receipts/{receiptNumber}", { path: { receiptNumber } }),
  documents: (id: string) => apiClient.GET("/client/projects/{projectId}/documents", path(id)),
  /** A short-lived signed link, issued after the server checks access. Never a public URL. */
  documentLink: (documentId: string) =>
    apiClient.POST("/client/documents/{documentId}/link", { path: { documentId } }),
  profile: () => apiClient.GET("/client/profile"),
  updateProfile: (body: ProfileUpdate) => apiClient.PATCH("/client/profile", { body }),
};
