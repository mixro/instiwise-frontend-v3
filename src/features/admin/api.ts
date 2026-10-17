import type { Balance } from "@/features/client/api";
import type { ClientSummary, StaffPayment, StaffProject } from "@/features/operator/api";
import { api, postJson } from "@/lib/api";
import type { Role } from "@/lib/roles";
import type { OperatorStatus } from "@/lib/status";

/*
 * Admin endpoints: system-wide (brief 5.3). Served by src/mocks/admin.ts until the
 * backend exists; shapes go into contracts/openapi.yaml in phase 3.1.
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
 *
 * Error codes: OPERATOR_HAS_CLIENTS, OPERATOR_NOT_ACTIVE, OPERATOR_NOT_PENDING,
 * PAYMENT_ALREADY_REVERSED, ADJUSTMENT_BELOW_ZERO, REASON_REQUIRED, VALIDATION_FAILED.
 */

export interface AdminOverview {
  clientCount: number;
  unassignedClientCount: number;
  activeOperatorCount: number;
  pendingOperatorCount: number;
  projectCount: number;
  activeProjectCount: number;
  changesWaitingForAdmin: number;
  /** All clients, all time, accepted agreements; payments net of corrections. */
  totals: Balance;
  recordedThisMonth: { month: string; amount: number; count: number };
  correctionsThisMonth: number;
  recentActivity: AuditEntry[];
}

export interface AdminClient extends ClientSummary {
  /** null until an admin assigns one. */
  operator: { id: string; name: string } | null;
}

export interface AdminProject extends StaffProject {
  clientName: string;
  operatorName: string | null;
  openChange: boolean;
}

export interface AdminOperator {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: OperatorStatus;
  registeredAt: string;
  /** Why it was rejected or suspended. */
  reason?: string;
  clients: { id: string; name: string }[];
}

export interface AdminFinance {
  totals: Balance;
  /** Payments and correction rows, newest first. */
  entries: StaffPayment[];
}

export const AUDIT_ACTIONS = [
  "PAYMENT_RECORDED",
  "PAYMENT_REVERSED",
  "PAYMENT_ADJUSTED",
  "OPERATOR_APPROVED",
  "OPERATOR_REJECTED",
  "OPERATOR_SUSPENDED",
  "OPERATOR_REACTIVATED",
  "CLIENT_ASSIGNED",
  "CHANGE_APPROVED",
  "CHANGE_NOT_APPROVED",
  "CHANGE_ACCEPTED",
  "CHANGE_REJECTED",
  "AGREEMENT_ACCEPTED",
  "SETTINGS_UPDATED",
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];

/** One audit log row. Values are data (names, numbers), never sentences, so the UI can translate. */
export interface AuditEntry {
  id: string;
  at: string;
  actor: string;
  actorRole: Role;
  action: AuditAction;
  /** What it was done to: a receipt number, a person, a change number. */
  target: string;
  amount?: number;
  /** The COR row a correction created. */
  correction?: string;
  from?: string;
  to?: string;
  reason?: string;
}

export interface AuditFilters {
  actor?: string;
  action?: AuditAction;
  /** YYYY-MM-DD, inclusive, Dar es Salaam calendar days. */
  from?: string;
  to?: string;
}

export interface AuditPage {
  entries: AuditEntry[];
  /** Everyone who appears in the log, for the user filter. */
  actors: string[];
}

export interface Settings {
  issuerName: string;
  issuerPhone: string;
  issuerAddress: string;
  /** +255…, used when a project's operator has no number. */
  whatsappNumber: string;
  invitationValidityDays: number;
}

export const SETTINGS_LIMITS = { invitationDaysMin: 1, invitationDaysMax: 30 } as const;

const id = encodeURIComponent;

export const adminApi = {
  overview: () => api<AdminOverview>("/admin/overview"),
  clients: () => api<AdminClient[]>("/admin/clients"),
  assignClient: (clientId: string, operatorId: string) =>
    postJson<AdminClient>(`/admin/clients/${id(clientId)}/assignment`, { operatorId }),
  projects: () => api<AdminProject[]>("/admin/projects"),
  operators: () => api<AdminOperator[]>("/admin/operators"),
  operatorAction: (
    operatorId: string,
    action: "approve" | "reject" | "suspend" | "reactivate",
    reason?: string,
  ) => postJson<AdminOperator>(`/admin/operators/${id(operatorId)}/${action}`, { reason }),
  finance: () => api<AdminFinance>("/admin/finance"),
  reverse: (paymentId: string, reason: string) =>
    postJson<StaffPayment>(`/admin/payments/${id(paymentId)}/reversal`, { reason }),
  adjust: (paymentId: string, amount: number, reason: string) =>
    postJson<StaffPayment>(`/admin/payments/${id(paymentId)}/adjustment`, { amount, reason }),
  audit: (filters: AuditFilters) => {
    const query = new URLSearchParams(
      Object.entries(filters).filter((entry): entry is [string, string] => Boolean(entry[1])),
    ).toString();
    return api<AuditPage>(`/admin/audit${query ? `?${query}` : ""}`);
  },
  settings: () => api<Settings>("/admin/settings"),
  saveSettings: (settings: Settings) =>
    api<Settings>("/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    }),
};
