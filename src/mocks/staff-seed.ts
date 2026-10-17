import type { AuditEntry, Settings } from "@/features/admin/api";
import type { MockOperator } from "./admin-store";
import type { MockProject } from "./client";

/*
 * Staff, clients and their assignment (per client: brief open question 3 is still
 * open, ADR 0002 scopes by client). The mock operator is Baraka Mushi.
 * Hamisi Kombo and Grace Lyimo belong to Zawadi Mollel, and Daudi Mrisho has no
 * operator yet: none of them may ever reach Baraka's screens. Hamisi and Grace
 * have payments this month (and corrections), so a leak would also change his totals.
 */

export const MOCK_OPERATOR_ID = "op_baraka";
export const MOCK_OPERATOR = "Baraka Mushi";
const ZAWADI = "Zawadi Mollel";
const ADMIN = "Rehema Said";

export interface MockClient {
  id: string;
  name: string;
  email: string;
  phone?: string;
  /** null: not assigned to any operator yet. */
  operatorId: string | null;
}

export function seedClients(): MockClient[] {
  return [
    {
      id: "cli_neema",
      name: "Neema Mwakyusa",
      email: "neema@example.com",
      phone: "+255713456789",
      operatorId: MOCK_OPERATOR_ID,
    },
    {
      id: "cli_saida",
      name: "Saida Mfinanga",
      email: "saida@example.com",
      phone: "+255765112233",
      operatorId: MOCK_OPERATOR_ID,
    },
    {
      id: "cli_hamisi",
      name: "Hamisi Kombo",
      email: "hamisi@example.com",
      phone: "+255744908070",
      operatorId: "op_zawadi",
    },
    {
      id: "cli_grace",
      name: "Grace Lyimo",
      email: "grace@example.com",
      phone: "+255688220011",
      operatorId: "op_zawadi",
    },
    {
      id: "cli_daudi",
      name: "Daudi Mrisho",
      email: "daudi@example.com",
      phone: "+255719330044",
      operatorId: null,
    },
  ];
}

export function seedOperators(): MockOperator[] {
  return [
    {
      id: MOCK_OPERATOR_ID,
      name: MOCK_OPERATOR,
      email: "baraka@example.com",
      phone: "+255754321987",
      status: "ACTIVE",
      registeredAt: "2026-07-02T08:00:00Z",
    },
    {
      id: "op_zawadi",
      name: ZAWADI,
      email: "zawadi@example.com",
      phone: "+255715600700",
      status: "ACTIVE",
      registeredAt: "2026-07-20T10:30:00Z",
    },
    {
      id: "op_juma",
      name: "Juma Kassim",
      email: "juma@example.com",
      phone: "+255622334455",
      status: "PENDING_APPROVAL",
      registeredAt: "2026-10-15T13:10:00Z",
    },
    {
      id: "op_pendo",
      name: "Pendo Massawe",
      email: "pendo@example.com",
      phone: "+255653120987",
      status: "PENDING_APPROVAL",
      registeredAt: "2026-10-16T18:45:00Z",
    },
    {
      id: "op_faraji",
      name: "Faraji Ngowi",
      email: "faraji@example.com",
      phone: "+255786450012",
      status: "SUSPENDED",
      registeredAt: "2026-06-11T09:00:00Z",
      reason: "Away on an industrial attachment until December.",
    },
  ];
}

export function seedSettings(): Settings {
  return {
    issuerName: "INSTIWISE Project Services",
    issuerPhone: "+255754000111",
    issuerAddress: "Dar es Salaam Institute of Technology, Bibi Titi Mohamed Road, Dar es Salaam",
    whatsappNumber: "+255754000111",
    invitationValidityDays: 7,
  };
}

export function seedAudit(): AuditEntry[] {
  const rows: Omit<AuditEntry, "id">[] = [
    {
      at: "2026-07-21T09:00:00Z",
      actor: ADMIN,
      actorRole: "ADMIN",
      action: "OPERATOR_APPROVED",
      target: ZAWADI,
    },
    {
      at: "2026-09-05T15:12:00Z",
      actor: "Neema Mwakyusa",
      actorRole: "CLIENT",
      action: "AGREEMENT_ACCEPTED",
      target: "PRJ-2026-014 v2",
    },
    {
      at: "2026-09-12T09:30:00Z",
      actor: ADMIN,
      actorRole: "ADMIN",
      action: "CLIENT_ASSIGNED",
      target: "Saida Mfinanga",
      to: MOCK_OPERATOR,
    },
    {
      at: "2026-09-20T08:00:00Z",
      actor: ADMIN,
      actorRole: "ADMIN",
      action: "OPERATOR_SUSPENDED",
      target: "Faraji Ngowi",
      reason: "Away on an industrial attachment until December.",
    },
    {
      at: "2026-10-08T10:05:00Z",
      actor: ZAWADI,
      actorRole: "OPERATOR",
      action: "PAYMENT_RECORDED",
      target: "RC-2026-0041",
      amount: 1_000_000,
    },
    {
      at: "2026-10-09T09:10:00Z",
      actor: ADMIN,
      actorRole: "ADMIN",
      action: "PAYMENT_ADJUSTED",
      target: "RC-2026-0041",
      correction: "COR-2026-0001",
      amount: -100_000,
      reason: "Recorded as 1,000,000; the bank slip shows 900,000.",
    },
    {
      at: "2026-10-10T11:35:00Z",
      actor: MOCK_OPERATOR,
      actorRole: "OPERATOR",
      action: "PAYMENT_RECORDED",
      target: "RC-2026-0047",
      amount: 500_000,
    },
    {
      at: "2026-10-12T14:05:00Z",
      actor: ZAWADI,
      actorRole: "OPERATOR",
      action: "PAYMENT_RECORDED",
      target: "RC-2026-0044",
      amount: 500_000,
    },
    {
      at: "2026-10-12T15:00:00Z",
      actor: ZAWADI,
      actorRole: "OPERATOR",
      action: "PAYMENT_RECORDED",
      target: "RC-2026-0045",
      amount: 500_000,
    },
    {
      at: "2026-10-12T16:20:00Z",
      actor: ADMIN,
      actorRole: "ADMIN",
      action: "PAYMENT_REVERSED",
      target: "RC-2026-0044",
      correction: "COR-2026-0002",
      amount: -500_000,
      reason: "Duplicate: the same M-Pesa payment was also recorded as RC-2026-0045.",
    },
    {
      at: "2026-10-16T07:30:00Z",
      actor: ADMIN,
      actorRole: "ADMIN",
      action: "CHANGE_APPROVED",
      target: "CR-2026-0003",
    },
  ];
  return rows.map((row, index) => ({ ...row, id: `aud_seed_${index + 1}` }));
}

/** Words and numbers that exist only in data of clients not assigned to Baraka (leak tests). */
export const UNASSIGNED_MARKERS = [
  "Hamisi Kombo",
  "Grace Lyimo",
  "Daudi Mrisho",
  "cli_hamisi",
  "cli_grace",
  "cli_daudi",
  "prj_weather",
  "prj_hostel",
  "Weather station for Chalinze school",
  "Hostel booking app report",
  "PRJ-2026-011",
  "PRJ-2026-019",
  "RC-2026-0041",
  "RC-2026-0044",
  "RC-2026-0045",
  "COR-2026-0001",
  "COR-2026-0002",
  "NMB 77K2Q",
  "Zawadi Mollel",
];

function acceptedV1(price: number, deadline: string, by: string, scope: string[]) {
  return {
    version: 1,
    status: "ACCEPTED" as const,
    createdAt: "2026-08-20T09:00:00Z",
    acceptedAt: "2026-08-21T09:00:00Z",
    acceptedBy: by,
    price,
    deadline,
    scope,
    exclusions: [],
    paymentTerms: ["Half before work starts", "Half on delivery"],
  };
}

export function seedUnassignedProjects(): MockProject[] {
  const base = {
    operatorName: ZAWADI,
    status: "ACTIVE" as const,
    category: "Prototype",
    progress: [],
    messages: [],
    documents: [],
    changeRequests: [],
  };
  return [
    {
      ...base,
      id: "prj_weather",
      clientId: "cli_hamisi",
      clientName: "Hamisi Kombo",
      reference: "PRJ-2026-011",
      title: "Weather station for Chalinze school",
      description: "Rain gauge, temperature and wind sensors with a classroom display.",
      deliverables: ["Weather station", "Display", "Report"],
      startDate: "2026-08-25",
      deadline: "2026-11-20",
      agreements: [
        acceptedV1(2_400_000, "2026-11-20", "Hamisi Kombo", ["Weather station", "Display"]),
      ],
      payments: [
        {
          id: "pay_41",
          receiptNumber: "RC-2026-0041",
          receivedAt: "2026-10-08T10:00:00Z",
          amount: 1_000_000,
          method: "bank",
          reference: "NMB 77K2Q",
          status: "ADJUSTED",
          recordedBy: ZAWADI,
        },
        {
          id: "cor_1",
          kind: "ADJUSTMENT",
          receiptNumber: "COR-2026-0001",
          corrects: "RC-2026-0041",
          receivedAt: "2026-10-09T09:10:00Z",
          amount: -100_000,
          method: "bank",
          status: "RECORDED",
          recordedBy: ADMIN,
          reason: "Recorded as 1,000,000; the bank slip shows 900,000.",
        },
      ],
    },
    {
      ...base,
      id: "prj_hostel",
      clientId: "cli_grace",
      clientName: "Grace Lyimo",
      reference: "PRJ-2026-019",
      title: "Hostel booking app report",
      category: "Book / report",
      description: "Final year report for a hostel booking web app.",
      deliverables: ["Report", "Slides"],
      startDate: "2026-09-01",
      deadline: "2026-10-30",
      agreements: [acceptedV1(500_000, "2026-10-30", "Grace Lyimo", ["Report", "Slides"])],
      payments: [
        {
          id: "pay_44",
          receiptNumber: "RC-2026-0044",
          receivedAt: "2026-10-12T11:00:00Z",
          amount: 500_000,
          method: "mobile",
          reference: "M-Pesa QW81JD2L",
          status: "REVERSED",
          recordedBy: ZAWADI,
        },
        {
          id: "pay_45",
          receiptNumber: "RC-2026-0045",
          receivedAt: "2026-10-12T12:00:00Z",
          amount: 500_000,
          method: "mobile",
          reference: "M-Pesa QW81JD2L",
          status: "RECORDED",
          recordedBy: ZAWADI,
        },
        {
          id: "cor_2",
          kind: "REVERSAL",
          receiptNumber: "COR-2026-0002",
          corrects: "RC-2026-0044",
          receivedAt: "2026-10-12T16:20:00Z",
          amount: -500_000,
          method: "mobile",
          status: "RECORDED",
          recordedBy: ADMIN,
          reason: "Duplicate: the same M-Pesa payment was also recorded as RC-2026-0045.",
        },
      ],
    },
  ];
}
