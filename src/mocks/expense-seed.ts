import type { Expense, ExpenseCategory } from "@/features/expenses/api";

/*
 * Six months of expenses (May to October 2026) for the mock backend, decided
 * 2026-10-25. Fixed costs every month (rent, internet), variable costs on
 * projects of Baraka's clients (Neema, Saida) and of Zawadi's clients (Hamisi,
 * Grace: Baraka must never see those), and one example of every state:
 * pending, rejected (and its corrected resubmission), withdrawn, adjusted and a
 * reversed duplicate. References are stored; correctedBy is worked out on read.
 */

export type MockExpense = Omit<
  Expense,
  "category" | "correctedBy" | "projectReference" | "projectTitle"
> & {
  categoryId: string;
};

export type MockExpenseCategory = Omit<ExpenseCategory, "usageCount">;

const BARAKA = { id: "op_baraka", name: "Baraka Mushi", role: "OPERATOR" } as const;
const ZAWADI = { id: "op_zawadi", name: "Zawadi Mollel", role: "OPERATOR" } as const;
const REHEMA = { id: "adm_rehema", name: "Rehema Said", role: "ADMIN" } as const;
export const EXPENSE_PEOPLE = { BARAKA, ZAWADI, REHEMA };

export function seedExpenseCategories(): MockExpenseCategory[] {
  return [
    { id: "cat_materials", name: "Materials", active: true },
    { id: "cat_transport", name: "Transport", active: true },
    { id: "cat_printing", name: "Printing", active: true },
    { id: "cat_software", name: "Software", active: true },
    { id: "cat_internet", name: "Internet", active: true },
    { id: "cat_rent", name: "Rent", active: true },
    { id: "cat_other", name: "Other", active: true },
  ];
}

type Seed = Omit<MockExpense, "id" | "reference" | "rowType" | "enteredAt"> & {
  enteredAt?: string;
};

const at = (day: string, time = "09:00:00") => `${day}T${time}Z`;

/** Entered by an admin: approved at once by the same person. */
function byAdmin(seed: Omit<Seed, "status" | "enteredBy" | "decidedBy" | "decidedAt">): Seed {
  return {
    ...seed,
    status: "APPROVED",
    enteredBy: REHEMA,
    decidedBy: REHEMA,
    decidedAt: at(seed.paidOn, "10:00:00"),
  };
}

/** Submitted by an operator, then decided by Rehema the next day (if decided). */
function byOperator(
  who: typeof BARAKA | typeof ZAWADI,
  seed: Omit<Seed, "enteredBy" | "decidedBy" | "decidedAt">,
  decidedOn?: string,
): Seed {
  return {
    ...seed,
    enteredBy: who,
    ...(decidedOn && seed.status !== "PENDING" && seed.status !== "WITHDRAWN"
      ? { decidedBy: REHEMA, decidedAt: at(decidedOn, "11:30:00") }
      : {}),
  };
}

const MONTHS = ["05", "06", "07", "08", "09", "10"];

function fixedCosts(): Seed[] {
  return MONTHS.flatMap((month) => [
    byAdmin({
      paidOn: `2026-${month}-01`,
      amount: 350_000,
      kind: "FIXED",
      categoryId: "cat_rent",
      description: "Office rent, Mikocheni",
      vendor: "Mama Rose Properties",
      paymentMethod: "bank",
      referenceNumber: `CRDB-RENT-${month}`,
    }),
    byAdmin({
      paidOn: `2026-${month}-05`,
      amount: 120_000,
      kind: "FIXED",
      categoryId: "cat_internet",
      description: "Office fibre internet",
      vendor: "TTCL",
      paymentMethod: "mobile",
    }),
  ]);
}

function seeds(): Seed[] {
  return [
    ...fixedCosts(),
    byAdmin({
      paidOn: "2026-07-14",
      amount: 95_000,
      kind: "FIXED",
      categoryId: "cat_software",
      description: "CAD software licence, one year (education)",
      vendor: "Autodesk",
      paymentMethod: "bank",
    }),
    // A duplicate of the August rent: reversed by the admin.
    byAdmin({
      paidOn: "2026-08-02",
      amount: 350_000,
      kind: "FIXED",
      categoryId: "cat_rent",
      description: "Office rent, Mikocheni",
      vendor: "Mama Rose Properties",
      paymentMethod: "bank",
    }),
    // Baraka's own fixed cost: he sees this entry, never the company's.
    byOperator(
      BARAKA,
      {
        paidOn: "2026-09-12",
        amount: 20_000,
        kind: "FIXED",
        categoryId: "cat_internet",
        description: "Airtime bundle for client calls",
        vendor: "Vodacom",
        paymentMethod: "mobile",
        status: "APPROVED",
      },
      "2026-09-13",
    ),
    // Solar water pump report (Neema, completed)
    byOperator(
      BARAKA,
      {
        paidOn: "2026-06-10",
        amount: 15_000,
        kind: "VARIABLE",
        categoryId: "cat_printing",
        description: "Printing the draft chapters",
        vendor: "Kariakoo Printers",
        paymentMethod: "cash",
        projectId: "prj_solar",
        status: "APPROVED",
      },
      "2026-06-11",
    ),
    byOperator(
      BARAKA,
      {
        paidOn: "2026-07-20",
        amount: 60_000,
        kind: "VARIABLE",
        categoryId: "cat_materials",
        description: "Scale model materials",
        paymentMethod: "cash",
        projectId: "prj_solar",
        status: "APPROVED",
      },
      "2026-07-21",
    ),
    byOperator(
      BARAKA,
      {
        paidOn: "2026-08-10",
        amount: 45_000,
        kind: "VARIABLE",
        categoryId: "cat_printing",
        description: "Final report printing for the client",
        vendor: "Kariakoo Printers",
        paymentMethod: "cash",
        projectId: "prj_solar",
        status: "APPROVED",
      },
      "2026-08-11",
    ),
    // Smart irrigation controller (Neema)
    byOperator(
      BARAKA,
      {
        paidOn: "2026-09-03",
        amount: 85_000,
        kind: "VARIABLE",
        categoryId: "cat_materials",
        description: "ESP32 boards (3)",
        vendor: "Kariakoo Electronics",
        paymentMethod: "mobile",
        referenceNumber: "MPESA-QX81K2",
        projectId: "prj_irrigation",
        status: "APPROVED",
      },
      "2026-09-04",
    ),
    // Adjusted later: the supplier refunded one faulty sensor.
    byOperator(
      BARAKA,
      {
        paidOn: "2026-09-06",
        amount: 140_000,
        kind: "VARIABLE",
        categoryId: "cat_materials",
        description: "Soil-moisture sensors (4)",
        vendor: "Kariakoo Electronics",
        paymentMethod: "mobile",
        projectId: "prj_irrigation",
        status: "APPROVED",
      },
      "2026-09-07",
    ),
    byOperator(
      BARAKA,
      {
        paidOn: "2026-09-20",
        amount: 65_000,
        kind: "VARIABLE",
        categoryId: "cat_materials",
        description: "GSM module and SIM card",
        paymentMethod: "cash",
        projectId: "prj_irrigation",
        status: "APPROVED",
      },
      "2026-09-21",
    ),
    byOperator(
      BARAKA,
      {
        paidOn: "2026-10-10",
        amount: 40_000,
        kind: "VARIABLE",
        categoryId: "cat_transport",
        description: "Bus to Kibaha for the installation",
        paymentMethod: "cash",
        projectId: "prj_irrigation",
        status: "APPROVED",
      },
      "2026-10-11",
    ),
    byOperator(BARAKA, {
      paidOn: "2026-10-22",
      amount: 35_000,
      kind: "VARIABLE",
      categoryId: "cat_transport",
      description: "Fuel for the field test",
      paymentMethod: "cash",
      projectId: "prj_irrigation",
      status: "PENDING",
    }),
    // Biogas digester gas monitor (Saida)
    byOperator(
      BARAKA,
      {
        paidOn: "2026-09-15",
        amount: 95_000,
        kind: "VARIABLE",
        categoryId: "cat_materials",
        description: "Gas pressure sensor",
        paymentMethod: "mobile",
        projectId: "prj_biogas",
        status: "APPROVED",
      },
      "2026-09-16",
    ),
    byOperator(BARAKA, {
      paidOn: "2026-09-16",
      amount: 95_000,
      kind: "VARIABLE",
      categoryId: "cat_materials",
      description: "Gas pressure sensor (entered twice)",
      paymentMethod: "mobile",
      projectId: "prj_biogas",
      status: "WITHDRAWN",
    }),
    byOperator(
      BARAKA,
      {
        paidOn: "2026-10-02",
        amount: 60_000,
        kind: "VARIABLE",
        categoryId: "cat_transport",
        description: "Taxi to Bagamoyo",
        paymentMethod: "cash",
        projectId: "prj_biogas",
        status: "REJECTED",
        decisionReason: "Please use the bus fare and add the ticket number, then submit again.",
      },
      "2026-10-03",
    ),
    byOperator(
      BARAKA,
      {
        paidOn: "2026-10-02",
        amount: 25_000,
        kind: "VARIABLE",
        categoryId: "cat_transport",
        description: "Bus to Bagamoyo and back",
        paymentMethod: "cash",
        referenceNumber: "BUS-551204",
        projectId: "prj_biogas",
        status: "APPROVED",
      },
      "2026-10-04",
    ),
    // Zawadi's clients: never in Baraka's responses.
    byOperator(
      ZAWADI,
      {
        paidOn: "2026-09-01",
        amount: 180_000,
        kind: "VARIABLE",
        categoryId: "cat_materials",
        description: "Rain gauge and anemometer",
        vendor: "Kariakoo Electronics",
        paymentMethod: "bank",
        projectId: "prj_weather",
        status: "APPROVED",
      },
      "2026-09-02",
    ),
    byOperator(ZAWADI, {
      paidOn: "2026-10-12",
      amount: 30_000,
      kind: "VARIABLE",
      categoryId: "cat_transport",
      description: "Trip to Chalinze school",
      paymentMethod: "cash",
      projectId: "prj_weather",
      status: "PENDING",
    }),
    byOperator(
      ZAWADI,
      {
        paidOn: "2026-10-01",
        amount: 30_000,
        kind: "VARIABLE",
        categoryId: "cat_printing",
        description: "Printing chapter drafts",
        paymentMethod: "cash",
        projectId: "prj_hostel",
        status: "APPROVED",
      },
      "2026-10-02",
    ),
  ];
}

/** References in date order, then the two seeded corrections. */
export function seedExpenses(): MockExpense[] {
  const rows: MockExpense[] = [...seeds()]
    .sort((a, b) => a.paidOn.localeCompare(b.paidOn))
    .map((seed, index) => ({
      ...seed,
      id: `exp_${index + 1}`,
      reference: `EXP-2026-${String(index + 1).padStart(3, "0")}`,
      rowType: "EXPENSE",
      enteredAt: seed.enteredAt ?? at(seed.paidOn, "08:00:00"),
    }));

  const duplicateRent = rows.find((r) => r.paidOn === "2026-08-02");
  const sensors = rows.find((r) => r.description === "Soil-moisture sensors (4)");
  if (!duplicateRent || !sensors) throw new Error("expense seed changed");

  duplicateRent.status = "REVERSED";
  sensors.status = "ADJUSTED";
  rows.push(
    {
      id: "expc_1",
      reference: "EXPC-2026-0001",
      paidOn: "2026-08-04",
      amount: -350_000,
      kind: "FIXED",
      categoryId: "cat_rent",
      description: duplicateRent.description,
      paymentMethod: "bank",
      status: "APPROVED",
      rowType: "REVERSAL",
      corrects: duplicateRent.reference,
      enteredBy: REHEMA,
      enteredAt: at("2026-08-04"),
      decidedBy: REHEMA,
      decidedAt: at("2026-08-04"),
      decisionReason: "The August rent was entered twice.",
    },
    {
      id: "expc_2",
      reference: "EXPC-2026-0002",
      paidOn: "2026-09-18",
      amount: -20_000,
      kind: "VARIABLE",
      categoryId: "cat_materials",
      description: sensors.description,
      paymentMethod: "mobile",
      projectId: "prj_irrigation",
      status: "APPROVED",
      rowType: "ADJUSTMENT",
      corrects: sensors.reference,
      enteredBy: REHEMA,
      enteredAt: at("2026-09-18"),
      decidedBy: REHEMA,
      decidedAt: at("2026-09-18"),
      decisionReason: "The supplier refunded one faulty sensor.",
    },
  );
  return rows;
}
