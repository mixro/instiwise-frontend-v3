import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { renderApp } from "@/test/render-app";

/*
 * Expense screens against the mock backend (src/mocks/expenses.ts). Tables also
 * render phone cards, so rows are looked up inside the desktop table. Each test
 * clicks through dialogs against the mock's delays, so allow more than 5 s when
 * the whole suite runs in parallel.
 */

const table = (name: string) => screen.getByRole("table", { name });
/** The row of an expense (not of a correction row, which repeats its description). */
const rowOf = (name: string, text: string) => {
  const rows = within(table(name))
    .getAllByText(text)
    .map((cell) => cell.closest("tr") as HTMLElement);
  const original = rows.find((row) => !/corrects EXP-/.test(row.textContent ?? ""));
  if (!original) throw new Error(`no expense row for "${text}"`);
  return original;
};

async function choose(label: string | RegExp, option: string | RegExp) {
  await userEvent.click(screen.getByRole("combobox", { name: label }));
  await userEvent.click(await screen.findByRole("option", { name: option }));
}

describe("operator expenses", { timeout: 15_000 }, () => {
  it("submits a variable expense after a check, then sees it awaiting approval", async () => {
    renderApp("/operator/finance/expenses/new", "OPERATOR");
    await screen.findByRole("heading", { level: 1, name: "Add expense" });
    expect(
      screen.getAllByText("An admin must approve this expense before it counts in any total.")
        .length,
    ).toBeGreaterThan(0);

    await userEvent.type(screen.getByLabelText("Amount (TZS)"), "48,000");
    await choose("Project", /Smart irrigation controller for Kibaha farm/);
    await choose("Category", "Materials");
    await userEvent.type(screen.getByLabelText("What was it for?"), "Relay modules (2)");
    await choose("Payment method", "Mobile money");
    await userEvent.type(screen.getByLabelText(/Receipt or transaction number/), "MPESA-RX55");
    await userEvent.click(screen.getByRole("button", { name: "Review" }));

    expect(
      await screen.findByRole("heading", { name: /Check this expense of TSh\s48,000/ }),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Submit for approval" }));

    expect(await screen.findByText(/submitted\. An admin will review it\./)).toBeInTheDocument();
    await screen.findByRole("heading", { level: 1, name: "Finance" });
    const row = await waitFor(() => rowOf("My expenses", "Relay modules (2)"));
    expect(row).toHaveTextContent("Awaiting approval");
  }, 20_000);

  it("offers only assigned clients' projects, and validates inline", async () => {
    renderApp("/operator/finance/expenses/new", "OPERATOR");
    await screen.findByRole("heading", { level: 1, name: "Add expense" });

    await userEvent.click(screen.getByRole("combobox", { name: "Project" }));
    const options = (await screen.findAllByRole("option")).map((o) => o.textContent ?? "");
    expect(options.some((o) => o.includes("Smart irrigation controller"))).toBe(true);
    for (const other of ["Weather station for Chalinze school", "Hostel booking app report"]) {
      expect(options.some((o) => o.includes(other))).toBe(false);
    }
    await userEvent.keyboard("{Escape}");

    const date = screen.getByLabelText("Date paid");
    await userEvent.clear(date);
    await userEvent.type(date, "2099-01-01");
    await userEvent.click(screen.getByRole("button", { name: "Review" }));
    expect(date).toHaveAccessibleDescription(/The date cannot be in the future\./);
    expect(screen.getByLabelText("Amount (TZS)")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("combobox", { name: "Project" })).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(screen.getByRole("combobox", { name: "Category" })).toHaveAttribute(
      "aria-invalid",
      "true",
    );

    // A fixed cost has no project at all.
    await userEvent.click(screen.getByRole("radio", { name: /^Fixed/ }));
    expect(screen.queryByRole("combobox", { name: "Project" })).not.toBeInTheDocument();
  });

  it("withdraws a pending entry after confirming", async () => {
    renderApp("/operator/finance", "OPERATOR");
    await screen.findByRole("table", { name: "My expenses" });
    const row = await waitFor(() => rowOf("My expenses", "Fuel for the field test"));
    // A rejected entry shows why.
    expect(rowOf("My expenses", "Taxi to Bagamoyo")).toHaveTextContent(
      /Reason: Please use the bus fare/,
    );

    await userEvent.click(within(row).getByRole("button", { name: /Withdraw/ }));
    const dialog = await screen.findByRole("dialog", { name: /Withdraw EXP-2026-\d+\?/ });
    await userEvent.click(within(dialog).getByRole("button", { name: "Withdraw" }));
    await waitFor(() =>
      expect(rowOf("My expenses", "Fuel for the field test")).toHaveTextContent("Withdrawn"),
    );
  });
});

describe("admin expenses", { timeout: 15_000 }, () => {
  const finance = () =>
    screen.getAllByRole("link", { name: /^Finance/ }).find((link) => link.closest("aside"));

  it("approves a pending expense after confirming, and the badge goes down", async () => {
    renderApp("/admin/finance?tab=expenses", "ADMIN");
    await screen.findByRole("table", { name: "Expenses" });
    await waitFor(() =>
      expect(finance()).toHaveAccessibleName("Finance 2 expenses waiting for approval"),
    );
    const row = await waitFor(() => rowOf("Expenses", "Fuel for the field test"));
    await userEvent.click(within(row).getByRole("button", { name: /^Approve/ }));
    const dialog = await screen.findByRole("dialog", { name: /Approve EXP-2026-\d+\?/ });
    expect(dialog).toHaveTextContent("entered by Baraka Mushi");
    await userEvent.click(within(dialog).getByRole("button", { name: "Approve" }));

    await waitFor(() =>
      expect(rowOf("Expenses", "Fuel for the field test")).toHaveTextContent("Approved"),
    );
    await waitFor(() =>
      expect(finance()).toHaveAccessibleName("Finance 1 expense waiting for approval"),
    );
  });

  it("rejects only with a reason", async () => {
    renderApp("/admin/finance?tab=expenses", "ADMIN");
    const row = await waitFor(() => rowOf("Expenses", "Trip to Chalinze school"));
    await userEvent.click(within(row).getByRole("button", { name: /^Reject/ }));
    const dialog = await screen.findByRole("dialog", { name: /Reject EXP-2026-\d+\?/ });
    const confirm = within(dialog).getByRole("button", { name: "Reject" });
    expect(confirm).toBeDisabled();
    await userEvent.type(within(dialog).getByLabelText("Reason for rejecting"), "No bus ticket.");
    await userEvent.click(confirm);
    // Under load the save and the dialog's exit take longer than waitFor's 1 s default.
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument(), {
      timeout: 5000,
    });
    await waitFor(() =>
      expect(rowOf("Expenses", "Trip to Chalinze school")).toHaveTextContent("Rejected"),
    );
    expect(rowOf("Expenses", "Trip to Chalinze school")).toHaveTextContent(
      "Reason: No bus ticket.",
    );
  });

  it("reverses with a reason and shows the original with its correction", async () => {
    renderApp("/admin/finance?tab=expenses", "ADMIN");
    const row = await waitFor(() => rowOf("Expenses", "ESP32 boards (3)"));
    await userEvent.click(within(row).getByRole("button", { name: /^Reverse/ }));
    const dialog = await screen.findByRole("dialog", { name: /Reverse EXP-2026-\d+\?/ });
    expect(within(dialog).getByRole("button", { name: "Reverse" })).toBeDisabled();
    await userEvent.type(
      within(dialog).getByLabelText("Reason for the correction"),
      "Bought for another project.",
    );
    await userEvent.click(within(dialog).getByRole("button", { name: "Reverse" }));
    expect(await screen.findByText(/reversed by EXPC-2026-\d{4}/)).toBeInTheDocument();

    await waitFor(() =>
      expect(rowOf("Expenses", "ESP32 boards (3)")).toHaveTextContent("Reversed"),
    );
    const reference = within(rowOf("Expenses", "ESP32 boards (3)")).getByRole("button", {
      name: /show its history/,
    });
    // No more corrections on a reversed expense: no Adjust or Reverse.
    expect(
      within(rowOf("Expenses", "ESP32 boards (3)")).queryByRole("button", { name: /^Reverse/ }),
    ).not.toBeInTheDocument();
    await userEvent.click(reference);
    const sheet = await screen.findByRole("dialog", { name: /History of EXP-2026-\d+/ });
    expect(within(sheet).getByText("Original")).toBeInTheDocument();
    expect(within(sheet).getByText(/EXPC-2026-\d{4}/)).toBeInTheDocument();
    expect(within(sheet).getByText("Bought for another project.")).toBeInTheDocument();
  }, 15_000);

  it("adjusts with a reason, and refuses a result below zero", async () => {
    renderApp("/admin/finance?tab=expenses", "ADMIN");
    const row = await waitFor(() => rowOf("Expenses", "GSM module and SIM card"));
    await userEvent.click(within(row).getByRole("button", { name: /^Adjust/ }));
    const dialog = await screen.findByRole("dialog", { name: /Adjust EXP-2026-\d+/ });
    expect(within(dialog).getByText("The expense was recorded")).toBeInTheDocument();

    await userEvent.click(within(dialog).getByRole("button", { name: "Adjust" }));
    expect(within(dialog).getByLabelText("Reason for the correction")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    await userEvent.type(within(dialog).getByLabelText("By how much (TZS)"), "70,000");
    await userEvent.type(
      within(dialog).getByLabelText("Reason for the correction"),
      "Supplier refund of the whole amount and more",
    );
    await userEvent.click(within(dialog).getByRole("button", { name: "Adjust" }));
    expect(await within(dialog).findByText(/below zero|reverse/i)).toBeInTheDocument();

    const amount = within(dialog).getByLabelText("By how much (TZS)");
    await userEvent.clear(amount);
    await userEvent.type(amount, "5,000");
    await userEvent.click(within(dialog).getByRole("button", { name: "Adjust" }));
    expect(await screen.findByText(/adjusted by EXPC-2026-\d{4}/)).toBeInTheDocument();
    await waitFor(() =>
      expect(rowOf("Expenses", "GSM module and SIM card")).toHaveTextContent("Adjusted"),
    );
  }, 15_000);

  it("approves an admin's own entry at once", async () => {
    renderApp("/admin/finance/expenses/new", "ADMIN");
    await screen.findByRole("heading", { level: 1, name: "Add expense" });
    expect(
      screen.getAllByText(
        "Expenses you add as an admin are approved at once and count straight away.",
      ).length,
    ).toBeGreaterThan(0);
    await userEvent.click(screen.getByRole("radio", { name: /^Fixed/ }));
    await userEvent.type(screen.getByLabelText("Amount (TZS)"), "60000");
    await choose("Category", "Other");
    await userEvent.type(screen.getByLabelText("What was it for?"), "Office cleaning, October");
    await choose("Payment method", "Cash");
    await userEvent.click(screen.getByRole("button", { name: "Review" }));
    await userEvent.click(await screen.findByRole("button", { name: "Add and approve" }));

    expect(await screen.findByText(/added and approved/)).toBeInTheDocument();
    const row = await waitFor(() => rowOf("Expenses", "Office cleaning, October"));
    expect(row).toHaveTextContent("Approved");
    expect(row).toHaveTextContent("Company cost");
  }, 20_000);
});

describe("expense categories in Settings", { timeout: 15_000 }, () => {
  it("cannot delete one in use; an unused one can be added and deleted", async () => {
    renderApp("/admin/settings", "ADMIN");
    const list = await screen.findByRole("list", { name: "Categories" });
    // Buttons repeat the name for screen readers ("Rename Rent"): take the item.
    const rent = within(list).getAllByText("Rent")[0]?.closest("li") as HTMLElement;
    expect(rent).toHaveTextContent(/Used by \d+ expenses/);
    expect(rent).toHaveTextContent("In use, so it cannot be deleted. Deactivate it instead.");
    expect(within(rent).queryByRole("button", { name: /^Delete/ })).not.toBeInTheDocument();

    await userEvent.type(screen.getByLabelText("New category"), "Lab fees");
    await userEvent.click(screen.getByRole("button", { name: "Add category" }));
    const lab = (await within(list).findAllByText("Lab fees"))[0]?.closest("li") as HTMLElement;
    expect(lab).toHaveTextContent("Not used yet");
    await userEvent.click(within(lab).getByRole("button", { name: /^Delete/ }));
    const dialog = await screen.findByRole("dialog", { name: "Delete Lab fees?" });
    await userEvent.click(within(dialog).getByRole("button", { name: "Delete" }));
    await waitFor(() => expect(within(list).queryByText("Lab fees")).not.toBeInTheDocument());
  });
});
