import { describe, expect, it } from "vitest";
import { staffState } from "@/mocks/admin-store";
import { expensesApi, type Expense, type ExpenseDraft } from "./api";

/*
 * Expenses through the mock backend, which plays the server (src/mocks/expenses.ts).
 * Seed: May to October 2026. Expected totals are worked out from the seed by hand.
 */

const HALF_YEAR = { from: "2026-05-01", to: "2026-10-31" };

const variable = (projectId: string, amount: number): ExpenseDraft => ({
  paidOn: "2026-10-20",
  amount,
  kind: "VARIABLE",
  categoryId: "cat_materials",
  description: "Relay module",
  paymentMethod: "cash",
  projectId,
});

const fixed = (amount: number): ExpenseDraft => ({
  paidOn: "2026-10-20",
  amount,
  kind: "FIXED",
  categoryId: "cat_other",
  description: "Office cleaning",
  paymentMethod: "cash",
});

async function seeded(description: string): Promise<Expense> {
  const page = await expensesApi.admin.list({ limit: 100 });
  const row = page.items.find(
    (item) => item.description === description && item.rowType === "EXPENSE",
  );
  if (!row) throw new Error(`no seeded expense "${description}"`);
  return row;
}

const lastAudit = () => staffState().audit.at(-1);

describe("operator submits", () => {
  it("saves as PENDING, audited", async () => {
    const saved = await expensesApi.operator.submit(variable("prj_irrigation", 12_000));
    expect(saved).toMatchObject({
      status: "PENDING",
      rowType: "EXPENSE",
      amount: 12_000,
      projectId: "prj_irrigation",
      projectTitle: "Smart irrigation controller for Kibaha farm",
      enteredBy: { id: "op_baraka", role: "OPERATOR" },
      correctedBy: [],
    });
    expect(saved.reference).toMatch(/^EXP-2026-\d{3}$/);
    expect(saved.decidedBy).toBeUndefined();
    expect(lastAudit()).toMatchObject({ action: "EXPENSE_SUBMITTED", target: saved.reference });
  });

  it("refuses an unassigned client's project as if it did not exist", async () => {
    await expect(
      expensesApi.operator.submit(variable("prj_weather", 12_000)),
    ).rejects.toMatchObject({
      code: "PROJECT_NOT_FOUND",
      status: 404,
    });
  });

  it("refuses a fixed cost with a project, and a variable cost without one", async () => {
    await expect(
      expensesApi.operator.submit({ ...fixed(10_000), projectId: "prj_irrigation" }),
    ).rejects.toMatchObject({ code: "EXPENSE_PROJECT_NOT_ALLOWED", status: 422 });
    const { projectId: _projectId, ...noProject } = variable("prj_irrigation", 10_000);
    void _projectId;
    await expect(expensesApi.operator.submit(noProject)).rejects.toMatchObject({
      code: "EXPENSE_PROJECT_REQUIRED",
      status: 422,
    });
  });

  it("accepts a fixed cost, which only that operator then sees", async () => {
    const saved = await expensesApi.operator.submit(fixed(18_000));
    expect(saved).toMatchObject({ kind: "FIXED", status: "PENDING" });
    expect(saved.projectId).toBeUndefined();
  });

  it("refuses whole-shilling violations", async () => {
    await expect(
      expensesApi.operator.submit({ ...variable("prj_irrigation", 0), amount: 1250.5 }),
    ).rejects.toMatchObject({ code: "VALIDATION_FAILED" });
  });
});

describe("operator lists and withdraws", () => {
  it("lists only the operator's own entries, fixed ones included", async () => {
    const page = await expensesApi.operator.list({ limit: 100 });
    expect(page.items.length).toBeGreaterThan(0);
    expect(page.items.every((row) => row.enteredBy.id === "op_baraka")).toBe(true);
    const descriptions = page.items.map((row) => row.description);
    expect(descriptions).toContain("Airtime bundle for client calls");
    expect(descriptions).not.toContain("Office rent, Mikocheni");
    expect(descriptions).not.toContain("Rain gauge and anemometer");
    expect(page.items.some((row) => row.projectId === "prj_weather")).toBe(false);

    const pending = await expensesApi.operator.list({ status: "PENDING" });
    expect(pending.items.map((row) => row.description)).toEqual(["Fuel for the field test"]);
    // The rejected one stays visible with its reason.
    const rejected = await expensesApi.operator.list({ status: "REJECTED" });
    expect(rejected.items[0]?.decisionReason).toMatch(/bus fare/);
  });

  it("withdraws only its own PENDING entries", async () => {
    const fuel = await seeded("Fuel for the field test");
    const withdrawn = await expensesApi.operator.withdraw(fuel.id);
    expect(withdrawn.status).toBe("WITHDRAWN");
    expect(lastAudit()).toMatchObject({ action: "EXPENSE_WITHDRAWN", target: fuel.reference });
    await expect(expensesApi.operator.withdraw(fuel.id)).rejects.toMatchObject({
      code: "EXPENSE_NOT_PENDING",
    });

    // Zawadi's pending trip: not his, so it does not exist for him.
    const chalinze = await seeded("Trip to Chalinze school");
    await expect(expensesApi.operator.withdraw(chalinze.id)).rejects.toMatchObject({
      code: "EXPENSE_NOT_FOUND",
      status: 404,
    });
  });
});

describe("admin enters and decides", () => {
  it("approves an admin's own entry at once, audited", async () => {
    const before = await expensesApi.admin.analytics(HALF_YEAR);
    const saved = await expensesApi.admin.create(fixed(40_000));
    expect(saved).toMatchObject({
      status: "APPROVED",
      enteredBy: { id: "adm_rehema", role: "ADMIN" },
      decidedBy: { id: "adm_rehema", role: "ADMIN" },
    });
    expect(lastAudit()).toMatchObject({
      action: "EXPENSE_APPROVED",
      actor: "Rehema Said",
      target: saved.reference,
      amount: 40_000,
    });
    const after = await expensesApi.admin.analytics(HALF_YEAR);
    expect(after.fixedExpenses - before.fixedExpenses).toBe(40_000);
    expect(after.profit - before.profit).toBe(-40_000);
  });

  it("rejects only with a reason, and approves only PENDING", async () => {
    const fuel = await seeded("Fuel for the field test");
    await expect(expensesApi.admin.reject(fuel.id, " ")).rejects.toMatchObject({
      code: "REASON_REQUIRED",
    });
    const rejected = await expensesApi.admin.reject(fuel.id, "No receipt for the fuel.");
    expect(rejected).toMatchObject({
      status: "REJECTED",
      decisionReason: "No receipt for the fuel.",
    });
    await expect(expensesApi.admin.approve(fuel.id)).rejects.toMatchObject({
      code: "EXPENSE_NOT_PENDING",
      status: 409,
    });
  });

  it("counts the pending ones", async () => {
    await expect(expensesApi.admin.pending()).resolves.toEqual({ count: 2, amount: 65_000 });
  });
});

describe("only APPROVED, non-reversed amounts count", () => {
  it("matches the seed", async () => {
    const admin = await expensesApi.admin.analytics(HALF_YEAR);
    // Rent and internet for six months, the software licence and Baraka's airtime:
    // 6 x (350,000 + 120,000) + 95,000 + 20,000. The duplicate rent is reversed.
    expect(admin.fixedExpenses).toBe(2_935_000);
    expect(admin.variableExpenses).toBe(760_000);
    expect(admin.expenses).toBe(3_695_000);
    expect(admin.awaitingApproval).toEqual({ count: 2, amount: 65_000 });
    expect(admin.profit).toBe(admin.collected - admin.expenses);
    expect(admin.monthly.map((m) => m.month)).toEqual([
      "2026-05",
      "2026-06",
      "2026-07",
      "2026-08",
      "2026-09",
      "2026-10",
    ]);
    // August: one rent, not two (the duplicate is reversed).
    expect(admin.monthly.find((m) => m.month === "2026-08")?.fixedExpenses).toBe(470_000);
  });

  it("ignores pending, rejected and withdrawn amounts, and reversals cancel out", async () => {
    const before = await expensesApi.admin.analytics(HALF_YEAR);

    const pending = await expensesApi.operator.submit(variable("prj_biogas", 70_000));
    const withdrawn = await expensesApi.operator.submit(variable("prj_biogas", 80_000));
    await expensesApi.operator.withdraw(withdrawn.id);
    const rejected = await expensesApi.operator.submit(variable("prj_biogas", 90_000));
    await expensesApi.admin.reject(rejected.id, "Duplicate of another entry.");
    const reversed = await expensesApi.admin.create(variable("prj_biogas", 100_000));
    await expensesApi.admin.reverse(reversed.id, "Entered on the wrong project.");

    const after = await expensesApi.admin.analytics(HALF_YEAR);
    expect(after.expenses).toBe(before.expenses);
    expect(after.profit).toBe(before.profit);
    expect(after.awaitingApproval).toEqual({
      count: before.awaitingApproval.count + 1,
      amount: before.awaitingApproval.amount + 70_000,
    });

    await expensesApi.admin.approve(pending.id);
    const approved = await expensesApi.admin.analytics(HALF_YEAR);
    expect(approved.variableExpenses - before.variableExpenses).toBe(70_000);

    const list = await expensesApi.admin.list({ projectId: "prj_biogas", limit: 100 });
    // 95,000 + 25,000 seeded, plus the 70,000 just approved.
    expect(list.approvedTotal).toBe(190_000);
  });
});

describe("operator analytics", () => {
  it("covers assigned clients' projects only, with no fixed costs", async () => {
    const mine = await expensesApi.operator.analytics(HALF_YEAR);
    expect(mine.variableExpenses).toBe(550_000);
    expect(mine.profit).toBe(mine.collected - 550_000);
    expect(mine.awaitingApproval).toEqual({ count: 1, amount: 35_000 });
    expect("fixedExpenses" in mine).toBe(false);
    expect(mine.monthly.every((m) => !("fixedExpenses" in m))).toBe(true);

    const projectIds = mine.projects.map((p) => p.projectId);
    expect(projectIds).toEqual(
      expect.arrayContaining(["prj_irrigation", "prj_biogas", "prj_solar"]),
    );
    expect(projectIds).not.toContain("prj_weather");
    expect(projectIds).not.toContain("prj_hostel");
    const categories = mine.byCategory.map((c) => c.name);
    for (const fixedCategory of ["Rent", "Internet", "Software"]) {
      expect(categories).not.toContain(fixedCategory);
    }
    const irrigation = mine.projects.find((p) => p.projectId === "prj_irrigation");
    expect(irrigation?.expenses).toBe(310_000);
    expect(irrigation?.marginBasisPoints).toBe(
      Math.round(((irrigation?.profit ?? 0) * 10_000) / (irrigation?.collected ?? 1)),
    );
  });

  it("refuses a period that ends before it starts", async () => {
    await expect(
      expensesApi.operator.analytics({ from: "2026-10-31", to: "2026-05-01" }),
    ).rejects.toMatchObject({ code: "VALIDATION_FAILED" });
  });
});

describe("corrections", () => {
  it("need a reason, never go below zero, and reverse only once", async () => {
    const boards = await seeded("ESP32 boards (3)");
    await expect(expensesApi.admin.reverse(boards.id, "")).rejects.toMatchObject({
      code: "REASON_REQUIRED",
    });
    await expect(
      expensesApi.admin.adjust(boards.id, -90_000, "Refund larger than the cost"),
    ).rejects.toMatchObject({ code: "ADJUSTMENT_BELOW_ZERO", status: 422 });

    const adjustment = await expensesApi.admin.adjust(boards.id, -5_000, "Discount at pickup");
    expect(adjustment).toMatchObject({
      rowType: "ADJUSTMENT",
      amount: -5_000,
      corrects: boards.reference,
      status: "APPROVED",
    });
    expect(adjustment.reference).toMatch(/^EXPC-2026-\d{4}$/);
    expect(lastAudit()).toMatchObject({
      action: "EXPENSE_ADJUSTED",
      correction: adjustment.reference,
    });
    expect((await seeded("ESP32 boards (3)")).status).toBe("ADJUSTED");

    // Reversing takes off what is left: 85,000 - 5,000.
    const reversal = await expensesApi.admin.reverse(boards.id, "Bought for another project");
    expect(reversal).toMatchObject({ rowType: "REVERSAL", amount: -80_000 });
    expect(lastAudit()).toMatchObject({ action: "EXPENSE_REVERSED", target: boards.reference });
    const original = await seeded("ESP32 boards (3)");
    expect(original.status).toBe("REVERSED");
    expect(original.correctedBy).toEqual([adjustment.reference, reversal.reference]);

    await expect(expensesApi.admin.reverse(boards.id, "Again")).rejects.toMatchObject({
      code: "EXPENSE_ALREADY_REVERSED",
      status: 409,
    });
    await expect(expensesApi.admin.adjust(boards.id, 1_000, "Again")).rejects.toMatchObject({
      code: "EXPENSE_ALREADY_REVERSED",
    });
  });

  it("only correct approved expenses", async () => {
    const fuel = await seeded("Fuel for the field test");
    await expect(expensesApi.admin.reverse(fuel.id, "Not yet approved")).rejects.toMatchObject({
      code: "EXPENSE_NOT_APPROVED",
      status: 409,
    });
  });
});

describe("categories", () => {
  it("are a managed list: no duplicates, no deleting used ones, deactivate instead", async () => {
    await expect(expensesApi.admin.createCategory("materials")).rejects.toMatchObject({
      code: "CATEGORY_NAME_TAKEN",
    });
    await expect(expensesApi.admin.deleteCategory("cat_rent")).rejects.toMatchObject({
      code: "CATEGORY_IN_USE",
      status: 409,
    });

    const lab = await expensesApi.admin.createCategory("Lab fees");
    expect(lab).toMatchObject({ active: true, usageCount: 0 });
    await expect(expensesApi.admin.deleteCategory(lab.id)).resolves.toBeUndefined();

    await expensesApi.admin.updateCategory("cat_printing", { active: false });
    expect(lastAudit()).toMatchObject({ action: "EXPENSE_CATEGORY_CHANGED" });
    const choices = await expensesApi.operator.categories();
    expect(choices.map((c) => c.name)).not.toContain("Printing");
    await expect(
      expensesApi.operator.submit({ ...variable("prj_solar", 5_000), categoryId: "cat_printing" }),
    ).rejects.toMatchObject({ code: "CATEGORY_INACTIVE" });
    // Old expenses keep the category.
    const all = await expensesApi.admin.categories();
    expect(all.find((c) => c.id === "cat_printing")).toMatchObject({ active: false });
    expect(all.find((c) => c.id === "cat_printing")?.usageCount).toBeGreaterThan(0);
  });
});

describe("pagination", () => {
  it("pages with a cursor, totals over every matching row", async () => {
    const first = await expensesApi.admin.list({ limit: 5 });
    expect(first.items).toHaveLength(5);
    expect(first.nextCursor).toBe("5");
    const second = await expensesApi.admin.list({ limit: 5, cursor: first.nextCursor ?? "" });
    expect(second.items.map((r) => r.id)).not.toEqual(first.items.map((r) => r.id));
    expect(second.approvedTotal).toBe(first.approvedTotal);
    expect(first.approvedTotal).toBe(3_695_000);
  });
});
