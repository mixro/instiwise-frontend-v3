import { delay, HttpResponse } from "msw";
import type {
  AgreementVersion,
  Balance,
  HomeSummary,
  Message,
  Payment,
  PaymentsOverview,
  ProgressUpdate,
  ProjectDetail,
  ProjectDocument,
  ProjectSummary,
  Profile,
  Receipt,
} from "@/features/client/api";
import type { Role } from "@/lib/roles";
import type { ProjectStatus } from "@/lib/status";
import type { ChangeRecord } from "./changes";
import { seedChangeRequests, seedOtherClientProjects } from "./change-seed";
import { addAudit } from "./admin-store";
import { accountLanguage, setAccountLanguage } from "./auth";
import { fail, on } from "./contract";
import { emailStatus } from "./email";
import { terms } from "./terms";
import { seedUnassignedProjects } from "./staff-seed";

/*
 * The signed-in client's data for the mock backend (Neema Mwakyusa).
 * Three projects: one active with a balance due, one completed and fully paid,
 * one waiting for the client to accept its agreement. Totals are computed here,
 * as the real server will; the screens never add money up.
 *
 * In memory, so accepting, messaging and profile edits last until a reload.
 * A message containing "[fail]" is refused, to show the send-failure state.
 */

const CLIENT = "Neema Mwakyusa";
const OPERATOR = { name: "Baraka Mushi", phone: "+255754321987" };

export interface MockProject {
  id: string;
  clientId: string;
  clientName: string;
  operatorName: string;
  reference: string;
  title: string;
  status: ProjectStatus;
  category: string;
  description: string;
  deliverables: string[];
  startDate: string;
  deadline: string;
  agreements: AgreementVersion[];
  progress: ProgressUpdate[];
  messages: MockMessage[];
  payments: MockPayment[];
  documents: ProjectDocument[];
  changeRequests: ChangeRecord[];
}

/**
 * A stored message. Whether it is "mine" depends on who reads it, so it is worked
 * out per viewer (toMessage). `read`: read by the client; `readByOperator`: read
 * by the operator. A message one side sends is unread for the other side.
 */
export interface MockMessage extends Omit<Message, "mine"> {
  read: boolean;
  readByOperator: boolean;
}

/** A stored message as the API returns it to this viewer. Admins never write, so nothing is "mine". */
export function toMessage(m: MockMessage, viewer: Role): Message {
  return {
    id: m.id,
    body: m.body,
    sentAt: m.sentAt,
    senderName: m.senderName,
    senderRole: m.senderRole,
    mine: viewer !== "ADMIN" && m.senderRole === viewer,
  };
}

/**
 * A stored payment or correction row. Rows are only ever added: a correction is
 * its own row (COR-…) pointing at the receipt it corrects (decided 2026-10-17).
 */
export type MockPayment = Omit<Payment, "projectId" | "projectTitle" | "kind" | "correctedBy"> & {
  /** Absent means an ordinary payment. */
  kind?: Payment["kind"];
  recordedBy?: string;
};

type SeedProject = Omit<MockProject, "clientId" | "clientName" | "operatorName" | "changeRequests">;

/** The signed-in mock client. Client endpoints only ever return this client's projects. */
export const MOCK_CLIENT_ID = "cli_neema";

/** The language and the email status live with the account (mocks/auth.ts, mocks/email.ts). */
type StoredProfile = Omit<Profile, "preferredLanguage" | "emailVerified" | "pendingEmail">;

function seedNeema(): { projects: SeedProject[]; profile: StoredProfile } {
  return {
    profile: { name: CLIENT, email: "neema@example.com", phone: "+255713456789" },
    projects: [
      {
        id: "prj_irrigation",
        reference: "PRJ-2026-014",
        title: "Smart irrigation controller for Kibaha farm",
        status: "ACTIVE",
        category: "Prototype",
        description:
          "An ESP32 controller that waters four beds from soil-moisture readings and sends an SMS when the tank is low.",
        deliverables: [
          "Working controller with four soil-moisture sensors",
          "Tank level sensor with SMS alerts",
          "Wiring diagram and user guide",
          "Project report (Word and PDF)",
        ],
        startDate: "2026-09-01",
        deadline: "2026-11-28",
        agreements: [
          {
            version: 2,
            status: "ACCEPTED",
            createdAt: "2026-09-04T09:30:00Z",
            acceptedAt: "2026-09-05T15:12:00Z",
            acceptedBy: CLIENT,
            price: 1_850_000,
            deadline: "2026-11-28",
            scope: terms(
              "Design and build the controller on an ESP32 board",
              "Four capacitive soil-moisture sensors, one per bed",
              "Ultrasonic tank level sensor with SMS alerts through a GSM module",
              "Project report and wiring diagram",
            ),
            exclusions: terms(
              "Plumbing and solenoid valve installation on the farm",
              "Airtime for SMS",
            ),
            paymentTerms: terms(
              "Deposit of TSh 600,000 before components are bought",
              "TSh 500,000 after the prototype demonstration",
              "The balance on delivery of the final report",
            ),
          },
          {
            version: 1,
            status: "SUPERSEDED",
            createdAt: "2026-08-27T08:00:00Z",
            acceptedAt: "2026-08-28T11:40:00Z",
            acceptedBy: CLIENT,
            price: 1_600_000,
            deadline: "2026-11-14",
            scope: terms(
              "Design and build the controller on an ESP32 board",
              "Four capacitive soil-moisture sensors, one per bed",
              "Project report and wiring diagram",
            ),
            exclusions: terms("Plumbing and solenoid valve installation on the farm"),
            paymentTerms: terms(
              "Deposit of TSh 600,000 before components are bought",
              "The balance on delivery of the final report",
            ),
          },
        ],
        progress: [
          {
            id: "pu_4",
            date: "2026-10-14",
            title: "Tank level alerts working",
            summary:
              "The tank sensor sends an SMS below 20%. Tested three times with the GSM module.",
            nextStep: "Field test at Kibaha on 24 October",
            author: OPERATOR.name,
          },
          {
            id: "pu_3",
            date: "2026-10-09",
            title: "Prototype demonstrated",
            summary:
              "Showed the controller watering two beds on the bench. Two of four sensors fitted.",
            nextStep: "Fit the remaining sensors",
            author: OPERATOR.name,
          },
          {
            id: "pu_2",
            date: "2026-09-22",
            title: "Components arrived",
            summary: "ESP32 boards, sensors and the GSM module arrived from Kariakoo.",
            author: OPERATOR.name,
          },
          {
            id: "pu_1",
            date: "2026-09-05",
            title: "Agreement version 2 accepted",
            summary: "Tank level alerts added to the scope.",
            author: OPERATOR.name,
          },
        ],
        messages: [
          message(
            "m1",
            "2026-10-09T13:05:00Z",
            OPERATOR.name,
            "Habari Neema, the demo went well. Video is in the progress notes.",
            true,
          ),
          message(
            "m2",
            "2026-10-09T15:40:00Z",
            CLIENT,
            "Asante! Can the SMS also go to my brother's number?",
            true,
          ),
          message(
            "m3",
            "2026-10-10T08:15:00Z",
            OPERATOR.name,
            "Yes, we can add a second number at no extra cost.",
            true,
          ),
          message(
            "m4",
            "2026-10-10T10:02:00Z",
            CLIENT,
            "Great. I have sent the second payment by bank.",
            true,
            false,
          ),
          message(
            "m5",
            "2026-10-14T16:20:00Z",
            OPERATOR.name,
            "Tank alerts now work. We plan the field test on Friday 24 October.",
            false,
          ),
          message(
            "m6",
            "2026-10-15T07:05:00Z",
            OPERATOR.name,
            "Please confirm someone can open the farm gate at 9:00.",
            false,
          ),
        ],
        payments: [
          payment(
            "pay_31",
            "RC-2026-0031",
            "2026-09-02T10:15:00Z",
            600_000,
            "mobile",
            "M-Pesa SGH7K2LQ9P",
          ),
          payment(
            "pay_47",
            "RC-2026-0047",
            "2026-10-10T11:30:00Z",
            500_000,
            "bank",
            "CRDB FT26283XK1",
          ),
        ],
        documents: [
          document(
            "doc_1",
            "Wiring diagram v3.pdf",
            "pdf",
            820_000,
            "Design",
            "2026-10-09T12:00:00Z",
          ),
          document(
            "doc_2",
            "Bench demo photo.jpg",
            "image",
            2_400_000,
            "Progress record",
            "2026-10-09T12:05:00Z",
          ),
        ],
      },
      {
        id: "prj_solar",
        reference: "PRJ-2026-009",
        title: "Final year report: solar water pump",
        status: "COMPLETED",
        category: "Book / report",
        description:
          "Final year project report and presentation for a solar-powered borehole pump, with a working scale model.",
        deliverables: [
          "Final report (Word and PDF)",
          "Presentation slides",
          "Scale model demonstration video",
        ],
        startDate: "2026-05-11",
        deadline: "2026-08-15",
        agreements: [
          {
            version: 1,
            status: "ACCEPTED",
            createdAt: "2026-05-11T07:45:00Z",
            acceptedAt: "2026-05-12T18:03:00Z",
            acceptedBy: CLIENT,
            price: 650_000,
            deadline: "2026-08-15",
            scope: terms(
              "Write the final report (five chapters)",
              "Prepare the presentation",
              "Build a scale model",
            ),
            exclusions: terms("Printing and binding"),
            paymentTerms: terms("Half before writing starts", "Half on delivery"),
          },
        ],
        progress: [
          {
            id: "ps_3",
            date: "2026-08-12",
            title: "Final report delivered",
            summary: "Report, slides and demo video uploaded to Documents.",
            author: OPERATOR.name,
          },
          {
            id: "ps_2",
            date: "2026-07-20",
            title: "Chapters 3 to 5 approved by your supervisor",
            summary: "Corrections from the supervisor applied.",
            author: OPERATOR.name,
          },
          {
            id: "ps_1",
            date: "2026-06-02",
            title: "Chapters 1 and 2 drafted",
            summary: "Shared on WhatsApp for your comments.",
            author: OPERATOR.name,
          },
        ],
        messages: [
          message(
            "s1",
            "2026-08-12T09:00:00Z",
            OPERATOR.name,
            "All final files are in Documents. Hongera!",
            true,
          ),
          message(
            "s2",
            "2026-08-12T12:30:00Z",
            CLIENT,
            "Asanteni sana, the presentation went very well.",
            true,
          ),
        ],
        payments: [
          payment("pay_12", "RC-2026-0012", "2026-05-13T14:00:00Z", 325_000, "cash"),
          payment(
            "pay_19",
            "RC-2026-0019",
            "2026-08-12T16:45:00Z",
            325_000,
            "mobile",
            "Mixx by Yas 7HT2KQ81",
          ),
        ],
        documents: [
          document(
            "doc_3",
            "Final report - solar water pump.pdf",
            "pdf",
            4_200_000,
            "Final deliverable",
            "2026-08-12T08:30:00Z",
          ),
          document(
            "doc_4",
            "Final report - solar water pump.docx",
            "word",
            2_900_000,
            "Final deliverable",
            "2026-08-12T08:30:00Z",
          ),
          document(
            "doc_5",
            "Bill of materials.xlsx",
            "spreadsheet",
            180_000,
            "Final deliverable",
            "2026-08-12T08:35:00Z",
          ),
          document(
            "doc_6",
            "Scale model photo.png",
            "image",
            3_600_000,
            "Final deliverable",
            "2026-08-12T08:40:00Z",
          ),
        ],
      },
      {
        id: "prj_attendance",
        reference: "PRJ-2026-021",
        title: "RFID attendance system for a secondary school",
        status: "AWAITING_CLIENT_ACCEPTANCE",
        category: "Prototype",
        description:
          "An RFID reader at the school gate that records arrivals and shows a daily attendance list on a web page.",
        deliverables: ["RFID gate reader with 50 cards", "Attendance web page", "Project report"],
        startDate: "2026-10-20",
        deadline: "2026-12-12",
        agreements: [
          {
            version: 1,
            status: "AWAITING_ACCEPTANCE",
            createdAt: "2026-10-14T10:00:00Z",
            price: 980_000,
            deadline: "2026-12-12",
            scope: terms(
              "RFID reader on an Arduino with a real-time clock",
              "50 RFID cards",
              "Simple web page listing each day's arrivals",
              "Project report",
            ),
            exclusions: terms("Internet connection at the school", "More than 50 cards"),
            paymentTerms: terms(
              "Deposit of TSh 400,000 after you accept this agreement",
              "The balance on delivery",
            ),
          },
        ],
        progress: [],
        messages: [
          message(
            "a1",
            "2026-10-14T10:05:00Z",
            OPERATOR.name,
            "Karibu Neema. The agreement is ready for you to review on the Agreement tab.",
            false,
          ),
        ],
        payments: [],
        documents: [],
      },
    ],
  };
}

/** `read`: by the client; `readByOperator`: by the operator (for the client's own messages). */
function message(
  id: string,
  sentAt: string,
  senderName: string,
  body: string,
  read: boolean,
  readByOperator = true,
): MockMessage {
  const fromClient = senderName === CLIENT;
  return {
    id,
    sentAt,
    senderName,
    senderRole: fromClient ? "CLIENT" : "OPERATOR",
    body,
    read: fromClient || read,
    readByOperator: !fromClient || readByOperator,
  };
}

function payment(
  id: string,
  receiptNumber: string,
  receivedAt: string,
  amount: number,
  method: Payment["method"],
  reference?: string,
): MockPayment {
  return { id, receiptNumber, receivedAt, amount, method, reference, status: "RECORDED" };
}

function document(
  id: string,
  name: string,
  kind: ProjectDocument["kind"],
  sizeBytes: number,
  category: string,
  uploadedAt: string,
): ProjectDocument {
  return { id, name, kind, sizeBytes, category, uploadedAt };
}

function seed(): { projects: MockProject[]; profile: StoredProfile } {
  const { projects, profile } = seedNeema();
  return {
    profile,
    projects: [
      ...projects.map((project) => ({
        ...project,
        clientId: MOCK_CLIENT_ID,
        clientName: CLIENT,
        operatorName: OPERATOR.name,
        changeRequests: seedChangeRequests(project.id),
      })),
      ...seedOtherClientProjects(),
      ...seedUnassignedProjects(),
    ],
  };
}

let state = seed();

/** Every project in the mock system (all clients). For the operator and admin handlers. */
export function mockProjects(): MockProject[] {
  return state.projects;
}

/** The mock client's current display name (it can be edited on the Account page). */
export function mockClientName(): string {
  return state.profile.name;
}

/** Projects of the signed-in mock client only, as the server scopes them. */
/**
 * The signed-in client's projects. A DRAFT project does not exist for the client
 * until staff send its agreement (decided 2026-10-25): no list, no 404 hint.
 */
function myProjects(): MockProject[] {
  return state.projects.filter(
    (project) => project.clientId === MOCK_CLIENT_ID && project.status !== "DRAFT",
  );
}

/** Back to the seed data. Tests call this between cases. */
export function resetMockClient(): void {
  state = seed();
}

// ----- computed like the server will compute them -----

/** The newest accepted version: the agreed price. A quote not yet accepted is not owed. */
export function acceptedAgreement(project: MockProject): AgreementVersion | undefined {
  return project.agreements.find((version) => version.status === "ACCEPTED");
}

export function balanceOf(project: MockProject): Balance {
  const agreedAmount = acceptedAgreement(project)?.price ?? 0;
  // Every row counts: a reversal row is minus the payment it reverses, so the two
  // cancel out; an adjustment row adds or removes the difference.
  const paidAmount = project.payments.reduce((sum, p) => sum + p.amount, 0);
  return {
    agreedAmount,
    paidAmount,
    balance: Math.max(agreedAmount - paidAmount, 0),
    credit: Math.max(paidAmount - agreedAmount, 0),
  };
}

function sumBalances(balances: Balance[]): Balance {
  return balances.reduce(
    (total, b) => ({
      agreedAmount: total.agreedAmount + b.agreedAmount,
      paidAmount: total.paidAmount + b.paidAmount,
      balance: total.balance + b.balance,
      credit: total.credit + b.credit,
    }),
    { agreedAmount: 0, paidAmount: 0, balance: 0, credit: 0 },
  );
}

function summaryOf(project: MockProject): ProjectSummary {
  return {
    id: project.id,
    reference: project.reference,
    title: project.title,
    status: project.status,
    deadline: project.deadline,
    unreadMessages: project.messages.filter((m) => m.senderRole !== "CLIENT" && !m.read).length,
    changesAwaitingDecision: project.changeRequests.filter(
      (change) => change.status === "AWAITING_CLIENT_ACCEPTANCE",
    ).length,
    ...balanceOf(project),
  };
}

/** A stored row as the API returns it, with the corrections it received. */
export function presentPayment(project: MockProject, p: MockPayment): Payment {
  return {
    id: p.id,
    receiptNumber: p.receiptNumber,
    receivedAt: p.receivedAt,
    amount: p.amount,
    method: p.method,
    reference: p.reference,
    status: p.status,
    corrects: p.corrects,
    reason: p.reason,
    kind: p.kind ?? "PAYMENT",
    correctedBy: project.payments
      .filter((other) => other.corrects === p.receiptNumber)
      .map((other) => other.receiptNumber),
    projectId: project.id,
    projectTitle: project.title,
  };
}

function paymentsOf(project: MockProject): Payment[] {
  return project.payments.map((p) => ({
    ...presentPayment(project, p),
    projectId: project.id,
    projectTitle: project.title,
  }));
}

const byNewest =
  <T>(date: (item: T) => string) =>
  (a: T, b: T) =>
    date(b).localeCompare(date(a));

/** A project's receipt, with the totals as they stood when it was issued. */
export function receiptFor(project: MockProject, receiptNumber: string): Receipt | undefined {
  const ordered = [...project.payments].sort((a, b) => a.receivedAt.localeCompare(b.receivedAt));
  const index = ordered.findIndex((p) => p.receiptNumber === receiptNumber);
  const paid = ordered[index];
  // Receipts exist for payments; correction rows are shown on the receipt they correct.
  if (!paid || (paid.kind ?? "PAYMENT") !== "PAYMENT") return undefined;
  const agreedAmount = acceptedAgreement(project)?.price ?? 0;
  const paidToDate = ordered.slice(0, index + 1).reduce((sum, p) => sum + p.amount, 0);
  return {
    receiptNumber: paid.receiptNumber,
    issuedAt: paid.receivedAt,
    status: paid.status,
    clientName: project.clientId === MOCK_CLIENT_ID ? state.profile.name : project.clientName,
    projectTitle: project.title,
    projectReference: project.reference,
    amount: paid.amount,
    method: paid.method,
    reference: paid.reference,
    receivedAt: paid.receivedAt,
    recordedBy: paid.recordedBy ?? project.operatorName,
    agreedAmount,
    paidToDate,
    balanceAfter: Math.max(agreedAmount - paidToDate, 0),
    corrections: project.payments
      .filter((row) => row.corrects === paid.receiptNumber)
      .map((row) => ({
        number: row.receiptNumber,
        kind: row.kind === "REVERSAL" ? "REVERSAL" : "ADJUSTMENT",
        amount: row.amount,
        at: row.receivedAt,
        by: row.recordedBy ?? "",
        reason: row.reason ?? "",
      })),
  };
}

const publicMessage = (m: MockMessage) => toMessage(m, "CLIENT");

function findProject(id: unknown): MockProject | undefined {
  return myProjects().find((project) => project.id === id);
}

const profileOut = (): Profile => ({
  ...state.profile,
  ...emailStatus(state.profile.email),
  preferredLanguage: accountLanguage(state.profile.email),
});

/** A confirmed email change of the demo client (ADR 0006). */
export function renameMockClientEmail(from: string, to: string): void {
  if (state.profile.email === from) state.profile.email = to;
}

export const clientHandlers = [
  on.get("/client/home", async () => {
    await delay();
    const summary: HomeSummary = {
      totals: sumBalances(myProjects().map(balanceOf)),
      projectCount: myProjects().length,
      latestProgress: myProjects()
        .flatMap((project) =>
          project.progress.map((update) => ({
            ...update,
            projectId: project.id,
            projectTitle: project.title,
          })),
        )
        .sort(byNewest((u) => u.date))
        .slice(0, 3),
      unread: myProjects()
        .map((project) => ({
          projectId: project.id,
          projectTitle: project.title,
          count: summaryOf(project).unreadMessages,
        }))
        .filter((entry) => entry.count > 0),
      awaitingAcceptance: myProjects().flatMap((project) => {
        const latest = project.agreements[0];
        return latest?.status === "AWAITING_ACCEPTANCE"
          ? [{ projectId: project.id, projectTitle: project.title, version: latest.version }]
          : [];
      }),
      changesAwaitingDecision: myProjects().flatMap((project) =>
        project.changeRequests
          .filter((change) => change.status === "AWAITING_CLIENT_ACCEPTANCE")
          .map((change) => ({
            projectId: project.id,
            projectTitle: project.title,
            number: change.number,
          })),
      ),
    };
    return HttpResponse.json(summary);
  }),

  on.get("/client/projects", async () => {
    await delay();
    return HttpResponse.json(myProjects().map(summaryOf));
  }),

  on.get("/client/projects/{projectId}", async ({ params }) => {
    await delay();
    const project = findProject(params.projectId);
    if (!project) return fail(404, "PROJECT_NOT_FOUND");
    const detail: ProjectDetail = {
      ...summaryOf(project),
      category: project.category,
      description: project.description,
      deliverables: project.deliverables,
      startDate: project.startDate,
      operator: OPERATOR,
    };
    return HttpResponse.json(detail);
  }),

  on.get("/client/projects/{projectId}/agreement", async ({ params }) => {
    await delay();
    const project = findProject(params.projectId);
    if (!project) return fail(404, "PROJECT_NOT_FOUND");
    // Draft versions are staff-only.
    return HttpResponse.json({
      versions: project.agreements.filter((version) => version.status !== "DRAFT"),
    });
  }),

  on.post(
    "/client/projects/{projectId}/agreement/versions/{version}/acceptance",
    async ({ params }) => {
      await delay();
      const project = findProject(params.projectId);
      const agreement = project?.agreements.find((a) => a.version === Number(params.version));
      if (!project || !agreement) return fail(404, "AGREEMENT_NOT_FOUND");
      if (agreement.status !== "AWAITING_ACCEPTANCE" || agreement !== project.agreements[0]) {
        return fail(409, "AGREEMENT_NOT_AWAITING_ACCEPTANCE");
      }
      agreement.status = "ACCEPTED";
      agreement.acceptedAt = new Date().toISOString();
      agreement.acceptedBy = state.profile.name;
      project.status = "ACTIVE";
      addAudit({
        actor: state.profile.name,
        actorRole: "CLIENT",
        action: "AGREEMENT_ACCEPTED",
        target: `${project.reference} v${agreement.version}`,
      });
      return HttpResponse.json(agreement);
    },
  ),

  on.get("/client/projects/{projectId}/progress", async ({ params }) => {
    await delay();
    const project = findProject(params.projectId);
    if (!project) return fail(404, "PROJECT_NOT_FOUND");
    return HttpResponse.json(project.progress);
  }),

  on.get("/client/projects/{projectId}/messages", async ({ params }) => {
    await delay();
    const project = findProject(params.projectId);
    if (!project) return fail(404, "PROJECT_NOT_FOUND");
    // One page holds the whole demo conversation.
    return HttpResponse.json({ items: project.messages.map(publicMessage), nextCursor: null });
  }),

  on.post("/client/projects/{projectId}/messages", async ({ params, request }) => {
    await delay();
    const project = findProject(params.projectId);
    if (!project) return fail(404, "PROJECT_NOT_FOUND");
    const { body } = await request.json();
    if (body.includes("[fail]")) return fail(500, "INTERNAL_ERROR");
    const sent: MockMessage = {
      id: `m_${Date.now()}`,
      body: body.trim(),
      sentAt: new Date().toISOString(),
      senderName: state.profile.name,
      senderRole: "CLIENT",
      read: true,
      // Waits for the operator.
      readByOperator: false,
    };
    project.messages.push(sent);
    return HttpResponse.json(publicMessage(sent), { status: 201 });
  }),

  on.post("/client/projects/{projectId}/messages/read", async ({ params }) => {
    const project = findProject(params.projectId);
    if (!project) return fail(404, "PROJECT_NOT_FOUND");
    for (const m of project.messages) m.read = true;
    return HttpResponse.json({ ok: true });
  }),

  on.get("/client/projects/{projectId}/payments", async ({ params }) => {
    await delay();
    const project = findProject(params.projectId);
    if (!project) return fail(404, "PROJECT_NOT_FOUND");
    const overview: PaymentsOverview = {
      totals: balanceOf(project),
      payments: paymentsOf(project).sort(byNewest((p) => p.receivedAt)),
      nextCursor: null,
    };
    return HttpResponse.json(overview);
  }),

  on.get("/client/payments", async () => {
    await delay();
    const overview: PaymentsOverview = {
      totals: sumBalances(myProjects().map(balanceOf)),
      payments: myProjects()
        .flatMap(paymentsOf)
        .sort(byNewest((p) => p.receivedAt)),
      nextCursor: null,
    };
    return HttpResponse.json(overview);
  }),

  on.get("/client/receipts/{receiptNumber}", async ({ params }) => {
    await delay();
    for (const project of myProjects()) {
      const receipt = receiptFor(project, params.receiptNumber);
      if (receipt) return HttpResponse.json(receipt);
    }
    return fail(404, "RECEIPT_NOT_FOUND");
  }),

  on.get("/client/projects/{projectId}/documents", async ({ params }) => {
    await delay();
    const project = findProject(params.projectId);
    if (!project) return fail(404, "PROJECT_NOT_FOUND");
    return HttpResponse.json(project.documents);
  }),

  on.post("/client/documents/{documentId}/link", async ({ params }) => {
    await delay();
    const doc = myProjects()
      .flatMap((p) => p.documents)
      .find((d) => d.id === params.documentId);
    if (!doc) return fail(404, "DOCUMENT_NOT_FOUND");
    // Stands in for a short-lived signed storage URL: a small text file you can open.
    const blob = new Blob([`INSTIWISE mock download\n\n${doc.name}\n`], { type: "text/plain" });
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    return HttpResponse.json({ url: URL.createObjectURL(blob), expiresAt });
  }),

  on.get("/client/profile", async () => {
    await delay();
    return HttpResponse.json(profileOut());
  }),

  on.patch("/client/profile", async ({ request }) => {
    await delay();
    const { name, phone, preferredLanguage } = await request.json();
    state.profile = { ...state.profile, name: name.trim(), phone: phone || undefined };
    if (preferredLanguage) setAccountLanguage(state.profile.email, preferredLanguage);
    return HttpResponse.json(profileOut());
  }),
];
