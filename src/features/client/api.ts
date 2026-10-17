import { api, postJson } from "@/lib/api";
import type { AgreementStatus, CorrectionKind, PaymentStatus, ProjectStatus } from "@/lib/status";

/*
 * The client's own data. The server scopes every endpoint to the signed-in
 * client and computes every total and balance; the screens only show them.
 * Served by src/mocks/client.ts until the backend exists (shapes go into
 * contracts/openapi.yaml in phase 3.1). Money is whole TZS.
 */

export type PaymentMethod = "cash" | "bank" | "mobile" | "other";

/** A recorded payment, or a correction row linked to one (never an edit). */
export type PaymentKind = "PAYMENT" | CorrectionKind;

/** Totals for one project or for all of a client's projects, as the server computed them. */
export interface Balance {
  agreedAmount: number;
  paidAmount: number;
  /** Still to pay; 0 when fully paid. */
  balance: number;
  /** Paid beyond the agreed amount, if any (brief 12.5). */
  credit: number;
}

export interface Person {
  name: string;
  /** +255XXXXXXXXX, for the WhatsApp shortcut. */
  phone?: string;
}

export interface ProjectSummary extends Balance {
  id: string;
  reference: string;
  title: string;
  status: ProjectStatus;
  deadline: string;
  unreadMessages: number;
  /** Change requests waiting for this client to accept or reject. */
  changesAwaitingDecision: number;
}

export interface ProjectDetail extends ProjectSummary {
  category: string;
  description: string;
  deliverables: string[];
  startDate: string;
  operator: Person;
}

export interface ProgressUpdate {
  id: string;
  date: string;
  title: string;
  summary: string;
  nextStep?: string;
  author: string;
}

export interface HomeSummary {
  totals: Balance;
  projectCount: number;
  latestProgress: (ProgressUpdate & { projectId: string; projectTitle: string })[];
  unread: { projectId: string; projectTitle: string; count: number }[];
  /** Agreements waiting for the client to accept them. */
  awaitingAcceptance: { projectId: string; projectTitle: string; version: number }[];
  /** Change requests waiting for the client's decision. */
  changesAwaitingDecision: { projectId: string; projectTitle: string; number: string }[];
}

export interface AgreementVersion {
  version: number;
  status: AgreementStatus;
  createdAt: string;
  price: number;
  deadline: string;
  scope: string[];
  exclusions: string[];
  paymentTerms: string[];
  acceptedAt?: string;
  acceptedBy?: string;
}

export interface Agreement {
  /** Newest first: the current version, then the ones it replaced. */
  versions: AgreementVersion[];
}

export interface Message {
  id: string;
  body: string;
  sentAt: string;
  senderName: string;
  /** Sent by the signed-in client. */
  mine: boolean;
}

export interface Payment {
  id: string;
  receiptNumber: string;
  receivedAt: string;
  amount: number;
  method: PaymentMethod;
  reference?: string;
  /** For PAYMENT rows; correction rows are always RECORDED. */
  status: PaymentStatus;
  kind: PaymentKind;
  /** Correction rows: the receipt number of the payment they correct. */
  corrects?: string;
  /** Payment rows: the COR numbers that corrected it, oldest first. */
  correctedBy?: string[];
  /** Correction rows: why (required, brief 12.6). */
  reason?: string;
  projectId: string;
  projectTitle: string;
}

export interface PaymentsOverview {
  totals: Balance;
  payments: Payment[];
}

export interface Receipt {
  receiptNumber: string;
  issuedAt: string;
  status: PaymentStatus;
  clientName: string;
  projectTitle: string;
  projectReference: string;
  amount: number;
  method: PaymentMethod;
  reference?: string;
  receivedAt: string;
  recordedBy: string;
  /** Snapshot when the receipt was issued. */
  agreedAmount: number;
  paidToDate: number;
  balanceAfter: number;
  /** Reversals and adjustments made to this payment since, oldest first. */
  corrections: ReceiptCorrection[];
}

export interface ReceiptCorrection {
  number: string;
  kind: CorrectionKind;
  /** Signed whole TZS: a reversal is minus the whole payment. */
  amount: number;
  at: string;
  by: string;
  reason: string;
}

export type DocumentKind = "pdf" | "word" | "slides" | "image" | "video" | "archive" | "other";

export interface ProjectDocument {
  id: string;
  name: string;
  kind: DocumentKind;
  sizeBytes: number;
  category: string;
  uploadedAt: string;
}

export interface Profile {
  name: string;
  email: string;
  phone?: string;
}

const base = "/client";

export const clientApi = {
  home: () => api<HomeSummary>(`${base}/home`),
  projects: () => api<ProjectSummary[]>(`${base}/projects`),
  project: (id: string) => api<ProjectDetail>(`${base}/projects/${encodeURIComponent(id)}`),
  agreement: (id: string) => api<Agreement>(`${base}/projects/${encodeURIComponent(id)}/agreement`),
  acceptAgreement: (id: string, version: number) =>
    postJson<AgreementVersion>(
      `${base}/projects/${encodeURIComponent(id)}/agreement/versions/${version}/acceptance`,
      {},
    ),
  progress: (id: string) =>
    api<ProgressUpdate[]>(`${base}/projects/${encodeURIComponent(id)}/progress`),
  messages: (id: string) => api<Message[]>(`${base}/projects/${encodeURIComponent(id)}/messages`),
  sendMessage: (id: string, body: string) =>
    postJson<Message>(`${base}/projects/${encodeURIComponent(id)}/messages`, { body }),
  markMessagesRead: (id: string) =>
    postJson<{ ok: true }>(`${base}/projects/${encodeURIComponent(id)}/messages/read`, {}),
  projectPayments: (id: string) =>
    api<PaymentsOverview>(`${base}/projects/${encodeURIComponent(id)}/payments`),
  payments: () => api<PaymentsOverview>(`${base}/payments`),
  receipt: (receiptNumber: string) =>
    api<Receipt>(`${base}/receipts/${encodeURIComponent(receiptNumber)}`),
  documents: (id: string) =>
    api<ProjectDocument[]>(`${base}/projects/${encodeURIComponent(id)}/documents`),
  /** A short-lived signed link, issued after the server checks access. Never a public URL. */
  documentLink: (documentId: string) =>
    postJson<{ url: string; expiresAt: string }>(
      `${base}/documents/${encodeURIComponent(documentId)}/link`,
      {},
    ),
  profile: () => api<Profile>(`${base}/profile`),
  updateProfile: (body: { name: string; phone?: string }) =>
    api<Profile>(`${base}/profile`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
};
