/**
 * Status values shown with StatusBadge. Values match the backend enums (SCREAMING_SNAKE).
 *
 * Project statuses: product brief section 8. Invitation statuses: section 6.4.
 * Payment statuses are only what is decided so far: staff record payments and
 * corrections are reversals. Verification statuses wait for brief open question 7.
 */

export const PROJECT_STATUSES = [
  "DRAFT",
  "AWAITING_CLIENT_ACCEPTANCE",
  "ACTIVE",
  "CHANGE_REQUEST_PENDING",
  "ON_HOLD",
  "COMPLETED",
  "CANCELLED",
  "ARCHIVED",
] as const;

/**
 * A payment's state. Corrections never edit or delete it (brief 12.6, decided
 * 2026-10-17): a reversal or an adjustment is a new COR row linked to it, and the
 * original keeps its receipt number with this status.
 */
export const PAYMENT_STATUSES = ["RECORDED", "REVERSED", "ADJUSTED"] as const;

/** The kind of correction row (always linked to the payment it corrects). */
export const CORRECTION_KINDS = ["REVERSAL", "ADJUSTMENT"] as const;

/** Operator accounts: invited operators wait for an admin (brief 6.3). */
export const OPERATOR_STATUSES = ["PENDING_APPROVAL", "ACTIVE", "SUSPENDED", "REJECTED"] as const;

export const INVITATION_STATUSES = [
  "PENDING",
  "ACCEPTED",
  "EXPIRED",
  "REVOKED",
  "REJECTED",
] as const;

/** Agreement versions (brief section 9): one awaits acceptance, accepted ones are kept, replaced ones are superseded. */
export const AGREEMENT_STATUSES = ["AWAITING_ACCEPTANCE", "ACCEPTED", "SUPERSEDED"] as const;

/**
 * Change requests (brief 10.5), as far as the decided flow uses them: an admin
 * reviews price/deadline changes, then the client accepts or rejects.
 */
export const CHANGE_REQUEST_STATUSES = [
  "UNDER_REVIEW",
  "AWAITING_CLIENT_ACCEPTANCE",
  "ACCEPTED",
  "REJECTED",
] as const;

export type ProjectStatus = (typeof PROJECT_STATUSES)[number];
export type ChangeRequestStatus = (typeof CHANGE_REQUEST_STATUSES)[number];
export type AgreementStatus = (typeof AGREEMENT_STATUSES)[number];
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];
export type CorrectionKind = (typeof CORRECTION_KINDS)[number];
export type OperatorStatus = (typeof OPERATOR_STATUSES)[number];
export type InvitationStatus = (typeof INVITATION_STATUSES)[number];

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
