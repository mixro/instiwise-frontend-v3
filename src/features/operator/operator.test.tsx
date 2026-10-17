import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { changesApi } from "@/features/changes/api";
import type { ApiError } from "@/lib/api";
import { formatTzs } from "@/lib/format";
import { UNASSIGNED_MARKERS } from "@/mocks/staff-seed";
import { renderApp } from "@/test/render-app";
import { operatorApi } from "./api";

// "This month" and the 30-day payment window depend on today: pin it.
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-17T09:00:00Z"));
});
afterEach(() => {
  vi.useRealTimers();
});

const tzs = (amount: number) => formatTzs(amount, "en");

/**
 * Nothing that only exists in unassigned clients' data may be on the page (text,
 * links, ids). The test's own location probe is left out: it echoes the URL the
 * test typed, which is not something the app showed.
 */
function expectNoUnassignedData() {
  const page = document.body.cloneNode(true) as HTMLElement;
  page.querySelector("[data-testid=location]")?.remove();
  const html = page.innerHTML;
  for (const marker of UNASSIGNED_MARKERS) {
    expect(html, `leaked "${marker}"`).not.toContain(marker);
  }
}

async function chooseOption(label: string, option: string | RegExp) {
  await userEvent.click(screen.getByRole("combobox", { name: label }));
  await userEvent.click(await screen.findByRole("option", { name: option }));
}

describe("unassigned clients never reach the operator", () => {
  it.each([
    ["/operator", "Dashboard"],
    ["/operator/clients", "My clients"],
    ["/operator/clients/cli_neema", "Neema Mwakyusa"],
    ["/operator/clients/cli_saida", "Saida Mfinanga"],
    ["/operator/payments", "Payment records"],
    ["/operator/payments/receipts/RC-2026-0047", "Receipt RC-2026-0047"],
    ["/operator/projects", "My projects"],
    ["/operator/projects/prj_biogas/changes", "Biogas digester gas monitor"],
  ])("%s shows only assigned clients", async (path, heading) => {
    renderApp(path, "OPERATOR");
    await screen.findByRole("heading", { level: 1, name: heading });
    await waitFor(() => expect(document.querySelector("main [aria-busy=true]")).toBeNull());
    expectNoUnassignedData();
  });

  it("offers only assigned clients when recording a payment", async () => {
    renderApp("/operator/payments/new", "OPERATOR");
    await screen.findByRole("heading", { level: 1, name: "Record a payment" });
    await userEvent.click(screen.getByRole("combobox", { name: "Client" }));

    const options = await screen.findAllByRole("option");
    expect(options.map((option) => option.textContent)).toEqual([
      "Neema Mwakyusa",
      "Saida Mfinanga",
    ]);
    expectNoUnassignedData();
  });

  it.each([
    ["/operator/clients/cli_hamisi"],
    ["/operator/clients/cli_grace"],
    ["/operator/payments/receipts/RC-2026-0041"],
    ["/operator/payments/receipts/RC-2026-0044"],
    ["/operator/projects/prj_weather/changes"],
  ])("opening %s by URL shows not found, revealing nothing", async (path) => {
    renderApp(path, "OPERATOR");
    expect(
      await screen.findByRole("heading", { level: 1, name: "Page not found" }),
    ).toBeInTheDocument();
    expectNoUnassignedData();
  });

  it("returns no unassigned data from any operator endpoint", async () => {
    const responses = await Promise.all([
      operatorApi.dashboard(),
      operatorApi.clients(),
      operatorApi.client("cli_neema"),
      operatorApi.client("cli_saida"),
      operatorApi.payments(),
      operatorApi.receipt("RC-2026-0047"),
      changesApi.operator.projects(),
    ]);
    const json = JSON.stringify(responses);
    for (const marker of UNASSIGNED_MARKERS) {
      expect(json, `leaked "${marker}"`).not.toContain(marker);
    }
  });

  it("refuses unassigned clients, projects and receipts with 404", async () => {
    const draft = {
      projectId: "prj_weather",
      amount: 100_000,
      method: "cash" as const,
      receivedOn: "2026-10-17",
    };
    for (const call of [
      () => operatorApi.client("cli_hamisi"),
      () => operatorApi.receipt("RC-2026-0041"),
      () => operatorApi.previewPayment(draft),
      () => operatorApi.recordPayment(draft),
      () => changesApi.operator.project("prj_weather"),
    ]) {
      await expect(call()).rejects.toMatchObject({ status: 404 } satisfies Partial<ApiError>);
    }
  });

  it("computes dashboard counts and totals over assigned clients only", async () => {
    renderApp("/operator", "OPERATOR");
    const money = await screen.findByRole("region", { name: "Money" });
    const work = screen.getByRole("region", { name: "Your work" });

    // Assigned: Neema (irrigation 1,850,000 / solar 650,000; RFID not yet accepted)
    // and Saida (biogas 1,200,000). Paid 1,750,000. Unassigned clients would add
    // 2,900,000 agreed and 1,500,000 paid, all of it this month.
    expect(within(work).getByText("Assigned clients").nextSibling).toHaveTextContent("2");
    expect(money.textContent).toContain(tzs(3_700_000));
    expect(money.textContent).toContain(tzs(1_750_000));
    expect(money.textContent).toContain(tzs(1_950_000));
    const month = within(money).getByText("Recorded this month").parentElement;
    expect(month?.textContent).toContain(tzs(500_000));
    expect(month).toHaveTextContent(/October 2026 · 1 payment/);
  });
});

describe("recording a payment", () => {
  async function fillPayment(amount: string, method: string, reference = "") {
    renderApp("/operator/payments/new?client=cli_neema", "OPERATOR");
    await screen.findByRole("heading", { level: 1, name: "Record a payment" });
    await chooseOption("Project", /Smart irrigation controller/);
    await userEvent.type(screen.getByLabelText("Amount received (TZS)"), amount);
    await chooseOption("Method", method);
    if (reference) await userEvent.type(screen.getByLabelText(/Transaction reference/), reference);
  }

  it("confirms with the server's balances, records, and ends on the receipt", async () => {
    await fillPayment("300,000", "Mobile money", "M-Pesa TX92KD7L");
    await userEvent.click(screen.getByRole("button", { name: "Review payment" }));

    const confirm = await screen.findByRole("region", {
      name: `Record ${tzs(300_000)}?`,
    });
    // 1,850,000 agreed, 1,100,000 paid before.
    expect(confirm.textContent).toContain(tzs(750_000));
    expect(confirm.textContent).toContain(tzs(450_000));
    expect(confirm).toHaveTextContent("Mobile money · M-Pesa TX92KD7L");

    await userEvent.click(within(confirm).getByRole("button", { name: "Record payment" }));

    expect(
      await screen.findByRole("heading", { level: 1, name: "Receipt RC-2026-0048" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Payment recorded\. Receipt RC-2026-0048 is ready/)).toBeVisible();
    await waitFor(() => expect(document.body.textContent).toContain(tzs(450_000)));
  });

  it("asks for a reference for mobile money but not for cash", async () => {
    await fillPayment("300000", "Mobile money");
    await userEvent.click(screen.getByRole("button", { name: "Review payment" }));
    expect(screen.getByLabelText(/Transaction reference/)).toHaveAccessibleDescription(
      /Enter the reference for bank and mobile-money payments/,
    );

    await chooseOption("Method", "Cash");
    await userEvent.click(screen.getByRole("button", { name: "Review payment" }));
    expect(await screen.findByRole("region", { name: /Record/ })).toBeInTheDocument();
  });

  it("refuses dates in the future or more than 30 days back", async () => {
    await fillPayment("300000", "Cash");
    const date = screen.getByLabelText("Date received");

    await userEvent.clear(date);
    await userEvent.type(date, "2026-10-18");
    await userEvent.click(screen.getByRole("button", { name: "Review payment" }));
    expect(date).toHaveAccessibleDescription(/cannot be in the future/);

    await userEvent.clear(date);
    await userEvent.type(date, "2026-09-16");
    expect(date).toHaveAccessibleDescription(/more than 30 days ago/);

    await userEvent.clear(date);
    await userEvent.type(date, "2026-09-17");
    await userEvent.click(screen.getByRole("button", { name: "Review payment" }));
    expect(await screen.findByRole("region", { name: /Record/ })).toBeInTheDocument();
  });

  it("warns when the payment is more than the balance", async () => {
    await fillPayment("1000000", "Cash");
    await userEvent.click(screen.getByRole("button", { name: "Review payment" }));
    const confirm = await screen.findByRole("region", { name: /Record/ });
    expect(confirm.textContent).toContain(`${tzs(250_000)} more than the balance`);
  });

  it("explains missing details", async () => {
    renderApp("/operator/payments/new", "OPERATOR");
    await screen.findByRole("heading", { level: 1, name: "Record a payment" });
    await userEvent.click(screen.getByRole("button", { name: "Review payment" }));

    expect(screen.getByRole("combobox", { name: "Client" })).toHaveAccessibleDescription(
      "Choose a client.",
    );
    expect(screen.getByLabelText("Amount received (TZS)")).toHaveAccessibleDescription(
      /more than 0/,
    );
    expect(screen.getByRole("combobox", { name: "Method" })).toHaveAccessibleDescription(
      "Choose how the client paid.",
    );
  });
});
