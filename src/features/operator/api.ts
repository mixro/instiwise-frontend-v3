import type { Balance, Payment, PaymentMethod, Receipt } from "@/features/client/api";
import { api, postJson } from "@/lib/api";
import type { ProjectStatus } from "@/lib/status";

/*
 * The operator's view. Every endpoint is scoped by the server to the clients
 * assigned to the signed-in operator (ADR 0002): unassigned clients never appear,
 * not even inside totals, and asking for one directly answers 404 (as if it did
 * not exist). Served by src/mocks/operator.ts until the backend exists.
 *
 * Decided 2026-10-17:
 * - Dashboard money: agreed, collected and outstanding over the assigned clients'
 *   accepted agreements (all time), plus payments recorded this calendar month
 *   (Dar es Salaam time).
 * - Recording a payment: whole TZS; a reference is required for bank transfer
 *   and mobile money, optional for cash; the payment date is today or up to 30
 *   days back, never in the future.
 *
 * Error codes: PAYMENT_REFERENCE_REQUIRED, PAYMENT_DATE_OUT_OF_RANGE,
 * VALIDATION_FAILED, CLIENT_NOT_FOUND, PROJECT_NOT_FOUND, RECEIPT_NOT_FOUND.
 */

export interface OperatorDashboard {
  clientCount: number;
  projectCount: number;
  activeProjectCount: number;
  openChangeCount: number;
  /** All time, accepted agreements of assigned clients. */
  totals: Balance;
  /** Payments recorded with a date in the current calendar month. */
  recordedThisMonth: { month: string; amount: number; count: number };
  upcomingDeadlines: {
    projectId: string;
    title: string;
    clientName: string;
    deadline: string;
  }[];
  recentPayments: StaffPayment[];
}

export interface ClientSummary extends Balance {
  id: string;
  name: string;
  phone?: string;
  email: string;
  projectCount: number;
}

export interface StaffProject extends Balance {
  id: string;
  reference: string;
  title: string;
  status: ProjectStatus;
  deadline: string;
}

export interface ClientDetail {
  client: ClientSummary;
  projects: StaffProject[];
  payments: StaffPayment[];
}

/** A payment or correction row as staff see it. */
export interface StaffPayment extends Payment {
  recordedBy: string;
  clientId: string;
  clientName: string;
}

export interface PaymentDraft {
  projectId: string;
  /** Whole TZS. */
  amount: number;
  method: PaymentMethod;
  reference?: string;
  /** YYYY-MM-DD, Dar es Salaam calendar day. */
  receivedOn: string;
  note?: string;
}

/** What recording would do, computed by the server before anything is saved. */
export interface PaymentPreview {
  clientName: string;
  projectTitle: string;
  projectReference: string;
  balanceBefore: number;
  balanceAfter: number;
  /** Paid beyond the agreed price after this payment (shown as credit, brief 12.5). */
  creditAfter: number;
}

export const operatorApi = {
  dashboard: () => api<OperatorDashboard>("/operator/dashboard"),
  clients: () => api<ClientSummary[]>("/operator/clients"),
  client: (id: string) => api<ClientDetail>(`/operator/clients/${encodeURIComponent(id)}`),
  payments: () => api<StaffPayment[]>("/operator/payments"),
  previewPayment: (draft: PaymentDraft) =>
    postJson<PaymentPreview>("/operator/payments/preview", draft),
  recordPayment: (draft: PaymentDraft) => postJson<StaffPayment>("/operator/payments", draft),
  receipt: (number: string) => api<Receipt>(`/operator/receipts/${encodeURIComponent(number)}`),
};
