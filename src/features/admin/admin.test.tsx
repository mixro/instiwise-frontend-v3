import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { delay, http, HttpResponse } from "msw";
import { afterEach, describe, expect, it, vi } from "vitest";
import { login } from "@/features/auth/api";
import { operatorApi } from "@/features/operator/api";
import { formatTzs } from "@/lib/format";
import { DEMO_PASSWORD } from "@/mocks/demo-data";
import { renderApp } from "@/test/render-app";
import { server } from "@/test/server";
import { adminApi, type AdminFinance, type AdminOverview, type AuditPage } from "./api";

const tzs = (amount: number) => formatTzs(amount, "en");
const ZERO = { agreedAmount: 0, paidAmount: 0, balance: 0, credit: 0 };

afterEach(() => {
  vi.useRealTimers();
});

/*
 * Every admin list: loading (a request that never answers), empty, and error
 * (a server error with an unknown code).
 */
const LISTS = [
  {
    name: "Clients",
    path: "/admin/clients",
    heading: "Clients",
    endpoint: "/api/admin/clients",
    empty: [],
    emptyText: "No clients yet",
  },
  {
    name: "Projects",
    path: "/admin/projects",
    heading: "Projects",
    endpoint: "/api/admin/projects",
    empty: [],
    emptyText: "No projects yet",
  },
  {
    name: "Operators",
    path: "/admin/operators",
    heading: "Operators",
    endpoint: "/api/admin/operators",
    empty: [],
    emptyText: "Nobody waiting for approval",
  },
  {
    name: "Finance",
    path: "/admin/finance",
    heading: "Finance",
    endpoint: "/api/admin/finance",
    empty: { totals: ZERO, entries: [], nextCursor: null } satisfies AdminFinance,
    emptyText: "No payments recorded yet",
  },
  {
    name: "Audit logs",
    path: "/admin/audit-logs",
    heading: "Audit logs",
    endpoint: "/api/admin/audit",
    empty: { entries: [], actors: [], nextCursor: null } satisfies AuditPage,
    emptyText: "Nothing in the audit log yet",
  },
  {
    name: "Change approvals",
    path: "/admin/projects/changes",
    heading: "Changes waiting for approval",
    endpoint: "/api/admin/change-requests",
    empty: [],
    emptyText: "Nothing waiting for your approval",
  },
  {
    name: "Overview (latest activity)",
    path: "/admin",
    heading: "Overview",
    endpoint: "/api/admin/overview",
    empty: {
      clientCount: 0,
      unassignedClientCount: 0,
      activeOperatorCount: 0,
      pendingOperatorCount: 0,
      projectCount: 0,
      activeProjectCount: 0,
      changesWaitingForAdmin: 0,
      totals: ZERO,
      recordedThisMonth: { month: "2026-10", amount: 0, count: 0 },
      correctionsThisMonth: 0,
      recentActivity: [],
    } satisfies AdminOverview,
    emptyText: "Nothing in the audit log yet",
  },
] as const;

describe("every admin list handles loading, empty and error", () => {
  it.each(LISTS)("$name: loading", async ({ path, heading, endpoint }) => {
    server.use(
      http.get(endpoint, async () => {
        await delay("infinite");
      }),
    );
    renderApp(path, "ADMIN");
    await screen.findByRole("heading", { level: 1, name: heading });
    expect(document.querySelector("main [aria-busy=true]")).not.toBeNull();
  });

  it.each(LISTS)("$name: empty", async ({ path, endpoint, empty, emptyText }) => {
    server.use(http.get(endpoint, () => HttpResponse.json(empty)));
    renderApp(path, "ADMIN");
    expect(await screen.findByText(emptyText)).toBeInTheDocument();
  });

  it.each(LISTS)("$name: error with a retry", async ({ path, endpoint }) => {
    server.use(
      http.get(endpoint, () =>
        HttpResponse.json({ error: { code: "INTERNAL_ERROR", message: "x" } }, { status: 500 }),
      ),
    );
    renderApp(path, "ADMIN");
    // 5xx is retried twice with back-off before the error shows.
    expect(
      await screen.findByText(
        "Something went wrong on our side. Try again.",
        {},
        { timeout: 6000 },
      ),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });

  it("Settings: loading and error", async () => {
    server.use(
      http.get("/api/admin/settings", async () => {
        await delay("infinite");
      }),
    );
    const { unmount } = renderApp("/admin/settings", "ADMIN");
    await screen.findByRole("heading", { level: 1, name: "Settings" });
    expect(document.querySelector("main [aria-busy=true]")).not.toBeNull();
    unmount();

    server.use(
      http.get("/api/admin/settings", () =>
        HttpResponse.json({ error: { code: "INTERNAL_ERROR", message: "x" } }, { status: 500 }),
      ),
    );
    renderApp("/admin/settings", "ADMIN");
    expect(
      await screen.findByRole("button", { name: "Try again" }, { timeout: 6000 }),
    ).toBeInTheDocument();
  });
});

describe("overview", () => {
  it("shows system-wide figures and what needs an admin", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-17T09:00:00Z"));
    renderApp("/admin", "ADMIN");
    const money = await screen.findByRole("region", { name: "Money" });

    // All clients: 1,850,000 + 650,000 + 1,200,000 + 2,400,000 + 500,000 agreed.
    // Paid net of corrections: 1,750,000 + 900,000 + 500,000.
    expect(money.textContent).toContain(tzs(6_600_000));
    expect(money.textContent).toContain(tzs(3_150_000));
    expect(money.textContent).toContain(tzs(3_450_000));
    // October: 500,000 + 1,000,000 − 100,000 + 500,000 + 500,000 − 500,000.
    expect(money.textContent).toContain(tzs(1_900_000));
    expect(money).toHaveTextContent("October 2026 · 4 payments, 2 corrections");

    const needs = screen.getByRole("region", { name: "Needs an admin" });
    expect(
      within(needs).getByRole("link", { name: /2 operators waiting for approval/ }),
    ).toBeVisible();
    expect(within(needs).getByRole("link", { name: /1 client without an operator/ })).toBeVisible();
  });
});

describe("clients and assignment", () => {
  it("assigns a client without an operator, and the operator then sees them", async () => {
    renderApp("/admin/clients", "ADMIN");
    const table = await screen.findByRole("table", { name: "Clients" });
    const assign = await within(table).findByRole("button", { name: /Daudi Mrisho/ });
    const row = assign.closest("tr") as HTMLElement;
    expect(row).toHaveTextContent("No operator");

    expect(assign).toHaveAccessibleName("Assign operator Daudi Mrisho");
    await userEvent.click(assign);
    const dialog = screen.getByRole("dialog", { name: "Operator for Daudi Mrisho" });
    await userEvent.click(within(dialog).getByRole("combobox", { name: "Operator" }));
    await userEvent.click(await screen.findByRole("option", { name: /Baraka Mushi/ }));
    await userEvent.click(within(dialog).getByRole("button", { name: "Assign" }));

    expect(await screen.findByText("Daudi Mrisho is now with Baraka Mushi")).toBeInTheDocument();
    await waitFor(() => expect(row).toHaveTextContent("Baraka Mushi"));
    expect((await operatorApi.clients()).map((c) => c.name)).toContain("Daudi Mrisho");
    const audit = await adminApi.audit({ action: "CLIENT_ASSIGNED" });
    expect(audit.entries[0]).toMatchObject({ target: "Daudi Mrisho", to: "Baraka Mushi" });
  });
});

describe("operators", () => {
  it("approves a waiting operator, who can then sign in", async () => {
    await expect(
      login({ email: "juma@example.com", password: DEMO_PASSWORD }),
    ).rejects.toMatchObject({ code: "ACCOUNT_PENDING_APPROVAL" });

    renderApp("/admin/operators", "ADMIN");
    const card = (await screen.findByRole("heading", { name: "Juma Kassim" })).closest(
      "li",
    ) as HTMLElement;
    await userEvent.click(within(card).getByRole("button", { name: "Approve" }));
    await userEvent.click(
      within(screen.getByRole("dialog", { name: "Approve Juma Kassim?" })).getByRole("button", {
        name: "Approve",
      }),
    );

    expect(await screen.findByText("Juma Kassim approved")).toBeInTheDocument();
    await expect(
      login({ email: "juma@example.com", password: DEMO_PASSWORD }),
    ).resolves.toMatchObject({
      user: { role: "OPERATOR" },
    });
  });

  it("needs a reason to turn an operator down", async () => {
    renderApp("/admin/operators", "ADMIN");
    const card = (await screen.findByRole("heading", { name: "Pendo Massawe" })).closest(
      "li",
    ) as HTMLElement;
    await userEvent.click(within(card).getByRole("button", { name: "Do not approve" }));
    const dialog = screen.getByRole("dialog", { name: "Not approve Pendo Massawe?" });

    const confirm = within(dialog).getByRole("button", { name: "Do not approve" });
    expect(confirm).toBeDisabled();
    await userEvent.type(within(dialog).getByLabelText("Reason"), "Not a DIT student.");
    await userEvent.click(confirm);
    expect(await screen.findByText("Pendo Massawe not approved")).toBeInTheDocument();
  });

  it("cannot suspend an operator who still has clients", async () => {
    renderApp("/admin/operators", "ADMIN");
    await userEvent.click(await screen.findByRole("tab", { name: /Active/ }));
    const card = (await screen.findByRole("heading", { name: "Baraka Mushi" })).closest(
      "li",
    ) as HTMLElement;

    expect(within(card).getByRole("button", { name: "Suspend" })).toBeDisabled();
    expect(card).toHaveTextContent("To suspend, first give their 2 clients to other operators");
    await expect(adminApi.operatorAction("op_baraka", "suspend", "Test")).rejects.toMatchObject({
      code: "OPERATOR_HAS_CLIENTS",
    });
  });

  it("reactivates a suspended operator", async () => {
    renderApp("/admin/operators", "ADMIN");
    await userEvent.click(await screen.findByRole("tab", { name: /Suspended/ }));
    const card = (await screen.findByRole("heading", { name: "Faraji Ngowi" })).closest(
      "li",
    ) as HTMLElement;
    expect(card).toHaveTextContent("Away on an industrial attachment until December.");

    await userEvent.click(within(card).getByRole("button", { name: "Reactivate" }));
    await userEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", { name: "Reactivate" }),
    );
    expect(await screen.findByText("Faraji Ngowi reactivated")).toBeInTheDocument();
  });
});

describe("finance corrections: new rows, never edits", () => {
  async function openFinance() {
    renderApp("/admin/finance", "ADMIN");
    const table = await screen.findByRole("table", { name: "Payments and corrections" });
    // The table shows skeleton rows until the ledger arrives.
    await within(table).findByRole("button", { name: /^RC-2026-0047/ });
    return table;
  }

  const rowOf = (table: HTMLElement, number: string) =>
    within(table)
      .getByRole("button", { name: new RegExp(`^${number}`) })
      .closest("tr") as HTMLElement;

  it("shows existing corrections next to the payments they correct", async () => {
    const table = await openFinance();
    expect(rowOf(table, "RC-2026-0044")).toHaveTextContent("Reversed");
    expect(rowOf(table, "COR-2026-0002")).toHaveTextContent("Reversalcorrects RC-2026-0044");
    expect(rowOf(table, "RC-2026-0041")).toHaveTextContent("Adjusted");
    // A reversed payment cannot be corrected again.
    expect(
      within(rowOf(table, "RC-2026-0044")).queryByRole("button", { name: /Reverse/ }),
    ).toBeNull();
  });

  it("reverses a payment with a new COR row and keeps the original", async () => {
    const table = await openFinance();
    const before = within(table).getAllByRole("row").length;
    await userEvent.click(
      within(rowOf(table, "RC-2026-0047")).getByRole("button", { name: /^Reverse/ }),
    );
    const dialog = screen.getByRole("dialog", { name: "Reverse RC-2026-0047?" });
    expect(within(dialog).getByRole("button", { name: "Reverse" })).toBeDisabled();
    await userEvent.type(
      within(dialog).getByLabelText("Reason for the correction"),
      "The bank transfer bounced on 14 October.",
    );
    await userEvent.click(within(dialog).getByRole("button", { name: "Reverse" }));

    expect(await screen.findByText("RC-2026-0047 reversed by COR-2026-0003")).toBeInTheDocument();
    await waitFor(() => expect(within(table).getAllByRole("row")).toHaveLength(before + 1));
    expect(rowOf(table, "RC-2026-0047")).toHaveTextContent("Reversed");
    expect(rowOf(table, "COR-2026-0003").textContent).toContain(tzs(-500_000));

    // The history shows the original exactly as recorded, then the correction.
    await userEvent.click(
      within(rowOf(table, "RC-2026-0047")).getByRole("button", { name: /^RC-2026-0047/ }),
    );
    const sheet = await screen.findByRole("dialog", { name: "History of RC-2026-0047" });
    expect(sheet.textContent).toContain(tzs(500_000));
    expect(sheet).toHaveTextContent("The bank transfer bounced on 14 October.");

    // The client's balance follows, computed by the server: 750,000 + 500,000.
    const home = await (await fetch(new URL("/api/client/home", window.location.origin))).json();
    expect(home.totals.balance).toBe(1_250_000);
  });

  it("adjusts part of a payment and refuses to go below zero", async () => {
    const table = await openFinance();
    await userEvent.click(
      within(rowOf(table, "RC-2026-0031")).getByRole("button", { name: /^Adjust/ }),
    );
    const dialog = screen.getByRole("dialog", { name: "Adjust RC-2026-0031" });
    await userEvent.type(within(dialog).getByLabelText("By how much (TZS)"), "700000");
    await userEvent.type(
      within(dialog).getByLabelText("Reason for the correction"),
      "Testing a reduction larger than the payment.",
    );
    await userEvent.click(within(dialog).getByRole("button", { name: "Adjust" }));
    expect(await within(dialog).findByRole("alert")).toHaveTextContent(
      "That would take the payment below zero. Reverse it instead.",
    );

    const amount = within(dialog).getByLabelText("By how much (TZS)");
    await userEvent.clear(amount);
    await userEvent.type(amount, "100,000");
    await userEvent.click(within(dialog).getByRole("button", { name: "Adjust" }));
    expect(await screen.findByText("RC-2026-0031 adjusted by COR-2026-0003")).toBeInTheDocument();
    await waitFor(() => expect(rowOf(table, "RC-2026-0031")).toHaveTextContent("Adjusted"));
    expect(rowOf(table, "COR-2026-0003").textContent).toContain(tzs(-100_000));
  });

  it("refuses a correction without a reason, and a second reversal", async () => {
    await expect(adminApi.reverse("pay_47", "  ")).rejects.toMatchObject({
      code: "REASON_REQUIRED",
    });
    await expect(adminApi.reverse("pay_44", "Again")).rejects.toMatchObject({
      code: "PAYMENT_ALREADY_REVERSED",
    });
  });
});

describe("audit log filters", () => {
  async function chooseFilter(label: string, option: string) {
    await userEvent.click(screen.getByRole("combobox", { name: label }));
    await userEvent.click(await screen.findByRole("option", { name: option }));
  }

  it("filters by user, action and date, and clears", async () => {
    renderApp("/admin/audit-logs", "ADMIN");
    const table = await screen.findByRole("table", { name: "Audit logs" });
    await waitFor(() => expect(within(table).getAllByRole("row").length).toBeGreaterThan(10));

    await chooseFilter("User", "Zawadi Mollel");
    await userEvent.click(screen.getByRole("button", { name: "Apply filters" }));
    await waitFor(() => expect(within(table).getAllByRole("row")).toHaveLength(1 + 3));

    await chooseFilter("User", "Everyone");
    await chooseFilter("Action", "Payment adjusted");
    await userEvent.click(screen.getByRole("button", { name: "Apply filters" }));
    await waitFor(() => expect(within(table).getAllByRole("row")).toHaveLength(2));
    expect(table).toHaveTextContent("Recorded as 1,000,000; the bank slip shows 900,000.");

    await chooseFilter("Action", "All actions");
    await userEvent.type(screen.getByLabelText("From"), "2026-01-01");
    await userEvent.type(screen.getByLabelText("To"), "2026-01-31");
    await userEvent.click(screen.getByRole("button", { name: "Apply filters" }));
    expect(await screen.findByText("No entries match these filters")).toBeInTheDocument();

    await userEvent.click(
      screen.getAllByRole("button", { name: "Clear filters" })[0] as HTMLElement,
    );
    expect(await screen.findByRole("table", { name: "Audit logs" })).toBeInTheDocument();
  });

  it("explains a date range that ends before it starts", async () => {
    renderApp("/admin/audit-logs", "ADMIN");
    await screen.findByRole("table", { name: "Audit logs" });
    await userEvent.type(screen.getByLabelText("From"), "2026-10-10");
    await userEvent.type(screen.getByLabelText("To"), "2026-10-01");
    expect(screen.getByLabelText("To")).toHaveAccessibleDescription(
      "The end date is before the start date.",
    );
  });
});

describe("settings", () => {
  it("validates, saves, and writes the change to the audit log", async () => {
    renderApp("/admin/settings", "ADMIN");
    const days = await screen.findByLabelText("Invitations stay valid for (days)");
    expect(days).toHaveValue("7");

    await userEvent.clear(days);
    await userEvent.type(days, "45");
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));
    expect(days).toHaveAccessibleDescription(/Enter a whole number of days from 1 to 30/);

    await userEvent.clear(days);
    await userEvent.type(days, "14");
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));
    expect(await screen.findByText("Settings saved")).toBeInTheDocument();

    const audit = await adminApi.audit({ action: "SETTINGS_UPDATED" });
    expect(audit.entries[0]).toMatchObject({
      target: "invitationValidityDays",
      actor: "Rehema Said",
    });
  });
});
