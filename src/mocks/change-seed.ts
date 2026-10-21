import type { ChangeRecord } from "./changes";
import type { MockProject } from "./client";

/*
 * Change-request history for the mock backend.
 * Irrigation (Neema): CR-1 accepted (it made agreement version 2), CR-2 rejected
 * by the client, CR-3 approved by the admin and waiting for the client's decision.
 * Biogas (another client, Saida Mfinanga): CR-4 waiting for admin approval.
 */

const OPERATOR = "Baraka Mushi";
const ADMIN = "Rehema Said";
const CLIENT = "Neema Mwakyusa";

const IRRIGATION_V1 = {
  scope: [
    "Design and build the controller on an ESP32 board",
    "Four capacitive soil-moisture sensors, one per bed",
    "Project report and wiring diagram",
  ],
  price: 1_600_000,
  deadline: "2026-11-14",
};

const IRRIGATION_V2 = {
  scope: [
    "Design and build the controller on an ESP32 board",
    "Four capacitive soil-moisture sensors, one per bed",
    "Ultrasonic tank level sensor with SMS alerts through a GSM module",
    "Project report and wiring diagram",
  ],
  price: 1_850_000,
  deadline: "2026-11-28",
};

const BIOGAS_V1 = {
  scope: [
    "Gas pressure sensor on the digester outlet",
    "LCD display of pressure and daily gas use",
    "Project report",
  ],
  price: 1_200_000,
  deadline: "2026-12-05",
};

export function seedChangeRequests(projectId: string): ChangeRecord[] {
  if (projectId !== "prj_irrigation") return [];
  return [
    {
      id: "chg_3",
      number: "CR-2026-0003",
      title: "Rain sensor and a second SMS number",
      reason:
        "Skip watering when it rains, and send the tank alerts to your brother's phone as you asked on 9 October.",
      createdAt: "2026-10-15T09:00:00Z",
      createdBy: OPERATOR,
      status: "AWAITING_CLIENT_ACCEPTANCE",
      before: IRRIGATION_V2,
      after: {
        scope: [
          ...IRRIGATION_V2.scope.slice(0, 3),
          "Rain sensor that skips watering when it rains",
          "SMS alerts to a second phone number",
          IRRIGATION_V2.scope[3] ?? "",
        ],
        price: 2_050_000,
        deadline: "2026-12-05",
      },
      needsAdminApproval: true,
      adminReview: { outcome: "APPROVED", by: ADMIN, at: "2026-10-16T07:30:00Z" },
    },
    {
      id: "chg_2",
      number: "CR-2026-0002",
      title: "Power the controller from a solar panel",
      reason: "Removes the need for mains power at the beds.",
      createdAt: "2026-09-28T10:20:00Z",
      createdBy: OPERATOR,
      status: "REJECTED",
      before: IRRIGATION_V2,
      after: {
        scope: [
          ...IRRIGATION_V2.scope.slice(0, 3),
          "20 W solar panel with charge controller and battery",
          IRRIGATION_V2.scope[3] ?? "",
        ],
        price: 2_250_000,
        deadline: "2026-11-28",
      },
      needsAdminApproval: true,
      adminReview: { outcome: "APPROVED", by: ADMIN, at: "2026-09-29T08:10:00Z" },
      clientDecision: {
        outcome: "REJECTED",
        by: CLIENT,
        at: "2026-10-02T17:45:00Z",
        reason: "Too expensive for this season. Maybe next year.",
      },
    },
    {
      id: "chg_1",
      number: "CR-2026-0001",
      title: "Add tank level alerts by SMS",
      reason: "You asked to know when the water tank runs low.",
      createdAt: "2026-09-03T12:00:00Z",
      createdBy: OPERATOR,
      status: "ACCEPTED",
      before: IRRIGATION_V1,
      after: IRRIGATION_V2,
      needsAdminApproval: true,
      adminReview: { outcome: "APPROVED", by: ADMIN, at: "2026-09-04T08:00:00Z" },
      clientDecision: { outcome: "ACCEPTED", by: CLIENT, at: "2026-09-05T15:12:00Z" },
      agreementVersion: 2,
    },
  ];
}

/** A project of another client, so operator and admin screens show more than Neema. */
export function seedOtherClientProjects(): MockProject[] {
  return [
    {
      id: "prj_biogas",
      clientId: "cli_saida",
      clientName: "Saida Mfinanga",
      operatorName: OPERATOR,
      reference: "PRJ-2026-017",
      title: "Biogas digester gas monitor",
      status: "ACTIVE",
      category: "Prototype",
      description: "Monitors gas pressure in a home biogas digester in Bagamoyo.",
      deliverables: ["Gas monitor with display", "Project report"],
      startDate: "2026-09-15",
      deadline: BIOGAS_V1.deadline,
      agreements: [
        {
          version: 1,
          status: "ACCEPTED",
          createdAt: "2026-09-12T09:00:00Z",
          acceptedAt: "2026-09-13T10:00:00Z",
          acceptedBy: "Saida Mfinanga",
          ...BIOGAS_V1,
          exclusions: ["Plumbing changes to the digester"],
          paymentTerms: ["Half before work starts", "Half on delivery"],
        },
      ],
      progress: [],
      messages: [
        {
          id: "b1",
          sentAt: "2026-10-16T08:10:00Z",
          senderName: OPERATOR,
          senderRole: "OPERATOR",
          body: "Habari Saida, the gas sensor arrived. We start the enclosure this week.",
          read: true,
          readByOperator: true,
        },
        {
          id: "b2",
          sentAt: "2026-10-16T18:45:00Z",
          senderName: "Saida Mfinanga",
          senderRole: "CLIENT",
          body: "Asante. Can the alarm also flash a light? The kitchen is noisy.",
          read: true,
          readByOperator: false,
        },
      ],
      payments: [],
      documents: [],
      changeRequests: [
        {
          id: "chg_4",
          number: "CR-2026-0004",
          title: "Add a methane leak alarm",
          reason: "The client wants a buzzer if gas leaks in the kitchen.",
          createdAt: "2026-10-16T12:00:00Z",
          createdBy: OPERATOR,
          status: "UNDER_REVIEW",
          before: BIOGAS_V1,
          after: {
            scope: [
              ...BIOGAS_V1.scope.slice(0, 2),
              "MQ-4 methane sensor with buzzer alarm",
              "Project report",
            ],
            price: 1_350_000,
            deadline: BIOGAS_V1.deadline,
          },
          needsAdminApproval: true,
        },
      ],
    },
  ];
}
