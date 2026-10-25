import type { Schema } from "@/lib/contract/types";

/**
 * Status values shown with StatusBadge. The types come from the contract
 * (contracts/openapi.yaml), so every tone record below must name every value the
 * API can send; the lists are built from those records, in their order.
 *
 * Project statuses: product brief section 8. Invitation statuses: section 6.4.
 * Payment statuses are only what is decided so far: staff record payments and
 * corrections are reversals. Verification statuses wait for brief open question 7.
 */

export type ProjectStatus = Schema<"ProjectStatus">;
export type ChangeRequestStatus = Schema<"ChangeRequestStatus">;
/** Agreement versions (brief section 9). Clients never receive DRAFT. */
export type AgreementStatus = Schema<"AgreementStatus">;
/**
 * A payment's state. Corrections never edit or delete it (brief 12.6, decided
 * 2026-10-17): a reversal or an adjustment is a new COR row linked to it, and the
 * original keeps its receipt number with this status.
 */
export type PaymentStatus = Schema<"PaymentStatus">;
/** The kind of correction row (always linked to the payment it corrects). */
export type CorrectionKind = Schema<"CorrectionKind">;
/** Operator accounts: invited operators wait for an admin (brief 6.3). */
export type OperatorStatus = Schema<"OperatorStatus">;
/** Brief 6.4. */
export type InvitationStatus = Schema<"InvitationStatus">;
/** Expenses (decided 2026-10-25): an admin decides PENDING ones; corrections are new rows. */
export type ExpenseStatus = Schema<"ExpenseStatus">;

/** Colour family of a badge. The label always carries the meaning; tone only reinforces it. */
export type StatusTone = "neutral" | "positive" | "warning" | "danger";

export const PROJECT_STATUS_TONES: Record<ProjectStatus, StatusTone> = {
  DRAFT: "neutral",
  AWAITING_CLIENT_ACCEPTANCE: "warning",
  ACTIVE: "positive",
  CHANGE_REQUEST_PENDING: "warning",
  ON_HOLD: "neutral",
  COMPLETED: "positive",
  CANCELLED: "danger",
  ARCHIVED: "neutral",
};

export const PAYMENT_STATUS_TONES: Record<PaymentStatus, StatusTone> = {
  RECORDED: "positive",
  REVERSED: "danger",
  ADJUSTED: "warning",
};

export const CORRECTION_KIND_TONES: Record<CorrectionKind, StatusTone> = {
  REVERSAL: "neutral",
  ADJUSTMENT: "neutral",
};

export const OPERATOR_STATUS_TONES: Record<OperatorStatus, StatusTone> = {
  PENDING_APPROVAL: "warning",
  ACTIVE: "positive",
  SUSPENDED: "danger",
  REJECTED: "neutral",
};

export const AGREEMENT_STATUS_TONES: Record<AgreementStatus, StatusTone> = {
  DRAFT: "neutral",
  AWAITING_ACCEPTANCE: "warning",
  ACCEPTED: "positive",
  SUPERSEDED: "neutral",
};

export const CHANGE_REQUEST_STATUS_TONES: Record<ChangeRequestStatus, StatusTone> = {
  UNDER_REVIEW: "warning",
  AWAITING_CLIENT_ACCEPTANCE: "warning",
  ACCEPTED: "positive",
  REJECTED: "danger",
};

export const INVITATION_STATUS_TONES: Record<InvitationStatus, StatusTone> = {
  PENDING: "warning",
  ACCEPTED: "positive",
  EXPIRED: "neutral",
  REVOKED: "danger",
  REJECTED: "danger",
};

export const EXPENSE_STATUS_TONES: Record<ExpenseStatus, StatusTone> = {
  PENDING: "warning",
  APPROVED: "positive",
  REJECTED: "danger",
  WITHDRAWN: "neutral",
  REVERSED: "danger",
  ADJUSTED: "warning",
};

const keysOf = <K extends string>(record: Record<K, unknown>) => Object.keys(record) as K[];

export const PROJECT_STATUSES = keysOf(PROJECT_STATUS_TONES);
export const PAYMENT_STATUSES = keysOf(PAYMENT_STATUS_TONES);
export const CORRECTION_KINDS = keysOf(CORRECTION_KIND_TONES);
export const OPERATOR_STATUSES = keysOf(OPERATOR_STATUS_TONES);
export const INVITATION_STATUSES = keysOf(INVITATION_STATUS_TONES);
export const AGREEMENT_STATUSES = keysOf(AGREEMENT_STATUS_TONES);
export const CHANGE_REQUEST_STATUSES = keysOf(CHANGE_REQUEST_STATUS_TONES);
export const EXPENSE_STATUSES = keysOf(EXPENSE_STATUS_TONES);
