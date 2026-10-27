import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { delay, http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { expensesApi } from "@/features/expenses/api";
import { NAVIGATION } from "@/features/shell/navigation";
import { formatTzs } from "@/lib/format";
import { renderApp } from "@/test/render-app";
import { server } from "@/test/server";

/*
 * Finance analytics (decided 2026-10-25), against the mock backend's seed
 * (src/mocks/expense-seed.ts). Every figure on screen is the server's.
 */

const tzs = (amount: number) => formatTzs(amount, "en");
const range = (from: string, to: string) => `period=custom&from=${from}&to=${to}`;
const ADMIN_PAGE = (query: string) => `/admin/finance?tab=analytics&${query}`;
const OPERATOR_PAGE = (query: string) => `/operator/finance?tab=reports&${query}`;
const OCTOBER = range("2026-10-01", "2026-10-31");

const totals = () => screen.findByRole("region", { name: "Totals for the period" });

/** The value of a tile, by its label. */
async function tile(label: string): Promise<string> {
  const term = within(await totals()).getByText(label, { selector: "dt" });
  return term.nextElementSibling?.textContent ?? "";
}

/** "-TSh 190,000" -> -190000. Only to compare figures the server sent. */
const amountOf = (text: string) => Number(text.replace(/[^\d-]/g, ""));

describe("admin analytics", { timeout: 40_000 }, () => {
  it("counts approved expenses only: pending, rejected and reversed ones are left out", async () => {
    renderApp(ADMIN_PAGE(OCTOBER), "ADMIN");
    // October: rent 350,000 and internet 120,000 (fixed); 40,000 + 25,000 + 30,000
    // approved variable costs. Not the pending 35,000 and 30,000, not the rejected 60,000.
    expect(await tile("Fixed expenses")).toBe(tzs(470_000));
    expect(await tile("Variable expenses")).toBe(tzs(95_000));
    expect(await tile("Awaiting approval")).toBe(tzs(65_000));
    expect(within(await totals()).getByText(/2 expenses paid in the period/)).toBeVisible();
  });

  it("nets a reversed expense to nothing", async () => {
    // August: a duplicate rent payment of 350,000 was entered and reversed.
    renderApp(ADMIN_PAGE(range("2026-08-01", "2026-08-31")), "ADMIN");
    expect(await tile("Fixed expenses")).toBe(tzs(470_000));
  });

  it("shows profit equal to collected minus approved expenses, overall and per project", async () => {
    renderApp(ADMIN_PAGE(range("2026-05-01", "2026-10-31")), "ADMIN");
    const collected = amountOf(await tile("Collected"));
    const fixed = amountOf(await tile("Fixed expenses"));
    const variable = amountOf(await tile("Variable expenses"));
    expect(collected).toBeGreaterThan(0);
    expect(amountOf(await tile("Profit"))).toBe(collected - fixed - variable);
    expect(screen.getByText("Profit = payments collected minus approved expenses.")).toBeVisible();

    const table = screen.getByRole("table", { name: "Profit per project" });
    const rows = within(table).getAllByRole("row").slice(1);
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      const cells = within(row)
        .getAllByRole("cell")
        .map((cell) => cell.textContent ?? "");
      // Project, agreed, collected, outstanding, variable expenses, profit, margin.
      expect(amountOf(cells[5] ?? "")).toBe(amountOf(cells[2] ?? "") - amountOf(cells[4] ?? ""));
    }
  });

  it("changes every figure when the period changes", async () => {
    renderApp(ADMIN_PAGE(OCTOBER), "ADMIN");
    expect(await tile("Collected")).toBe(tzs(1_900_000));
    expect(screen.getByText("Showing 1 Oct 2026 to 31 Oct 2026")).toBeVisible();

    fireEvent.change(screen.getByLabelText("From"), { target: { value: "2026-09-01" } });
    expect(await screen.findByText("Showing 1 Sept 2026 to 31 Oct 2026")).toBeVisible();
    await waitFor(async () => expect(await tile("Collected")).toBe(tzs(2_500_000)));
    expect(await tile("Fixed expenses")).toBe(tzs(960_000));
    expect(await tile("Profit")).toBe(tzs(900_000));
    expect(screen.getByTestId("location")).toHaveTextContent("/admin/finance");
  });

  it("refuses a range that ends before it starts", async () => {
    renderApp(ADMIN_PAGE(range("2026-10-31", "2026-10-01")), "ADMIN");
    expect(
      await screen.findByText("The start date must be on or before the end date."),
    ).toBeVisible();
    expect(screen.queryByRole("region", { name: "Totals for the period" })).not.toBeInTheDocument();
  });

  it("shows the empty state for a period with no money", async () => {
    renderApp(ADMIN_PAGE(range("2025-01-01", "2025-01-31")), "ADMIN");
    expect(await screen.findByText("Nothing collected or spent in this period")).toBeVisible();
    expect(screen.queryByRole("region", { name: "Totals for the period" })).not.toBeInTheDocument();
  });

  it("shows loading, then an error with a retry", async () => {
    server.use(
      http.get("/api/admin/finance/analytics", async () => {
        await delay(200);
        return HttpResponse.json(
          { error: { code: "INTERNAL_ERROR", message: "x" } },
          { status: 500 },
        );
      }),
    );
    renderApp(ADMIN_PAGE(OCTOBER), "ADMIN");
    await screen.findByRole("tab", { name: "Analytics", selected: true });
    expect(document.querySelector("main [aria-busy=true]")).not.toBeNull();
    expect(
      await screen.findByText(
        "Something went wrong on our side. Try again.",
        {},
        { timeout: 8000 },
      ),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: "Try again" })).toBeVisible();
  });

  it("offers every chart as a table, and links the pending figure to the list", async () => {
    const user = userEvent.setup();
    renderApp(ADMIN_PAGE(OCTOBER), "ADMIN");
    await totals();
    for (const toggle of screen.getAllByRole("button", { name: "Show as table" })) {
      await user.click(toggle);
      expect(toggle).toHaveAttribute("aria-pressed", "true");
    }
    const trend = screen.getByRole("table", { name: "Monthly trend" });
    expect(within(trend).getByRole("columnheader", { name: "Fixed expenses" })).toBeVisible();
    expect(within(trend).getByText("October 2026")).toBeVisible();
    const categories = screen.getByRole("table", { name: "Expenses by category" });
    expect(within(categories).getByText("Rent")).toBeVisible();

    expect(screen.getByRole("link", { name: "See pending expenses" })).toHaveAttribute(
      "href",
      "/admin/finance?tab=expenses&status=PENDING",
    );
  });

  it("filters and links the projects", async () => {
    const user = userEvent.setup();
    renderApp(ADMIN_PAGE(range("2026-05-01", "2026-10-31")), "ADMIN");
    const table = await screen.findByRole("table", { name: "Profit per project" });
    expect(within(table).getByRole("link", { name: "Hostel booking app report" })).toHaveAttribute(
      "href",
      expect.stringMatching(/^\/admin\/projects\/[^/]+\/agreement$/),
    );
    await user.type(screen.getByLabelText("Find a project or client"), "biogas");
    expect(within(table).getAllByRole("row")).toHaveLength(2);
    expect(within(table).getByText("Biogas digester gas monitor")).toBeVisible();
  });
});

describe("operator reports", { timeout: 40_000 }, () => {
  it("cover assigned clients only, with no fixed costs or company totals", async () => {
    const user = userEvent.setup();
    renderApp(OPERATOR_PAGE(range("2026-05-01", "2026-10-31")), "OPERATOR");
    expect(await screen.findByText(/^Includes your assigned clients only/)).toBeVisible();
    await totals();
    expect(screen.queryByText("Fixed expenses")).not.toBeInTheDocument();
    expect(screen.queryByText(/whole company/i)).not.toBeInTheDocument();

    const collected = amountOf(await tile("Collected"));
    const variable = amountOf(await tile("Variable expenses"));
    expect(amountOf(await tile("Profit"))).toBe(collected - variable);

    // Zawadi's clients' projects (weather station, hostel) are not Baraka's.
    const projects = screen.getByRole("table", { name: "Profit per project" });
    expect(within(projects).getByText("Smart irrigation controller for Kibaha farm")).toBeVisible();
    expect(within(projects).queryByText(/Weather station|Hostel/)).not.toBeInTheDocument();

    for (const toggle of screen.getAllByRole("button", { name: "Show as table" })) {
      await user.click(toggle);
    }
    const categories = screen.getByRole("table", { name: "Variable expenses by category" });
    expect(within(categories).queryByText(/Rent|Internet/)).not.toBeInTheDocument();
    const trend = screen.getByRole("table", { name: "Monthly trend" });
    expect(within(trend).queryByText("Fixed expenses")).not.toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/Weather station|Hostel booking|\bRent\b/);
  });

  it("match the operator endpoint, which never returns fixed costs", async () => {
    const mine = await expensesApi.operator.analytics({ from: "2026-10-01", to: "2026-10-31" });
    renderApp(OPERATOR_PAGE(OCTOBER), "OPERATOR");
    expect(await tile("Collected")).toBe(tzs(mine.collected));
    expect(await tile("Variable expenses")).toBe(tzs(mine.variableExpenses));
    expect(await tile("Profit")).toBe(tzs(mine.profit));
    expect(mine).not.toHaveProperty("fixedExpenses");
  });

  it("show the empty state for a period with no money", async () => {
    renderApp(OPERATOR_PAGE(range("2025-01-01", "2025-01-31")), "OPERATOR");
    expect(await screen.findByText("Nothing collected or spent in this period")).toBeVisible();
  });
});

describe("clients never reach analytics", () => {
  it("have no analytics route", async () => {
    renderApp("/client/analytics", "CLIENT");
    expect(
      await screen.findByRole("heading", { level: 1, name: "Page not found" }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/collected|profit|margin/i)).not.toBeInTheDocument();
  });

  it("have no link to finance, analytics or reports", () => {
    const paths = NAVIGATION.CLIENT.map((item) => item.to);
    expect(paths.join(" ")).not.toMatch(/finance|analytics|report/);
  });

  it.each([ADMIN_PAGE(OCTOBER), OPERATOR_PAGE(OCTOBER)])(
    "get the no-access page on %s",
    async (path) => {
      renderApp(path, "CLIENT");
      expect(await screen.findByRole("link", { name: "Go to my home page" })).toBeVisible();
      expect(screen.getByTestId("location")).toHaveTextContent(/^\/no-access$/);
      expect(screen.queryByText(/Totals for the period/)).not.toBeInTheDocument();
    },
  );
});
