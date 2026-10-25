import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { formatTzs } from "@/lib/format";
import { renderApp } from "@/test/render-app";
import { changesApi } from "./api";

// Amounts contain no-break spaces, which getByText would normalise away.
const tzs = (amount: number) => formatTzs(amount, "en");

async function openClientChanges() {
  renderApp("/client/projects/prj_irrigation/changes", "CLIENT");
  return screen.findByRole("region", { name: "Rain sensor and a second SMS number" });
}

describe("client: change waiting for a decision", () => {
  it("previews price, deadline and scope before and after", async () => {
    const waiting = await openClientChanges();

    expect(waiting.textContent).toContain(tzs(1_850_000));
    expect(waiting.textContent).toContain(tzs(2_050_000));
    expect(waiting.textContent).toContain(`${tzs(200_000)} more`);
    expect(within(waiting).getByText("Later than before")).toBeInTheDocument();
    expect(within(waiting).getByText("Added")).toBeInTheDocument();
    expect(
      within(waiting).getByText("Rain sensor that skips watering when it rains"),
    ).toBeInTheDocument();
    expect(within(waiting).getByText("4 items unchanged")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Changes/ })).toHaveTextContent(
      "change waiting for your decision",
    );
  });

  it("lists earlier changes with who decided and why", async () => {
    await openClientChanges();
    const history = screen.getByRole("region", { name: "Change history" });

    expect(within(history).getByText(/It became agreement version 2/)).toBeInTheDocument();
    expect(
      within(history).getByText("Too expensive for this season. Maybe next year."),
    ).toBeInTheDocument();
  });

  it("is on the home page as an action", async () => {
    renderApp("/client", "CLIENT");
    expect(
      await screen.findByText(/Change CR-2026-0003 to Smart irrigation controller/),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Review the change" })).toHaveAttribute(
      "href",
      "/client/projects/prj_irrigation/changes",
    );
  });

  it("accepting creates agreement version 3 and the new balance", async () => {
    const waiting = await openClientChanges();
    await userEvent.click(within(waiting).getByRole("button", { name: "Accept change" }));
    const dialog = screen.getByRole("dialog", { name: "Accept change CR-2026-0003?" });
    await userEvent.click(within(dialog).getByRole("button", { name: "Accept change" }));

    expect(
      await screen.findByText("Change CR-2026-0003 accepted. The agreement is updated."),
    ).toBeInTheDocument();
    // The waiting card is gone; the change now sits in the history as accepted.
    await waitFor(() => expect(screen.queryByText("Waiting for your decision")).toBeNull());
    const history = screen.getByRole("region", { name: "Change history" });
    expect(within(history).getAllByText("Accepted")).toHaveLength(2);

    await userEvent.click(screen.getByRole("tab", { name: "Agreement" }));
    expect(await screen.findByRole("heading", { name: "Version 3" })).toBeInTheDocument();
    expect(document.body.textContent).toContain(tzs(2_050_000));

    // 2,050,000 agreed minus 1,100,000 paid, as the server now computes it.
    await userEvent.click(screen.getByRole("tab", { name: "Payments" }));
    await waitFor(() => expect(document.body.textContent).toContain(tzs(950_000)));
  });

  it("rejecting needs a reason, which then shows in the history", async () => {
    const waiting = await openClientChanges();
    await userEvent.click(within(waiting).getByRole("button", { name: "Reject change" }));
    const dialog = screen.getByRole("dialog", { name: "Reject change CR-2026-0003?" });

    const confirm = within(dialog).getByRole("button", { name: "Reject change" });
    expect(confirm).toBeDisabled();
    await userEvent.type(
      within(dialog).getByLabelText("Why are you rejecting this change?"),
      "The deadline is too late for my exam.",
    );
    await userEvent.click(confirm);

    expect(await screen.findByText("Change CR-2026-0003 rejected")).toBeInTheDocument();
    const history = await screen.findByRole("region", { name: "Change history" });
    await within(history).findByText("The deadline is too late for my exam.");
    expect(within(history).getAllByText("Rejected")).toHaveLength(2);
  });

  it("explains a change that was decided elsewhere and shows the outcome", async () => {
    const waiting = await openClientChanges();
    await userEvent.click(within(waiting).getByRole("button", { name: "Accept change" }));
    const dialog = screen.getByRole("dialog");

    // Decided in another tab meanwhile.
    await changesApi.client.decide("chg_3", { outcome: "REJECT", reason: "Changed my mind" });
    await userEvent.click(within(dialog).getByRole("button", { name: "Accept change" }));

    expect(await within(dialog).findByRole("alert")).toHaveTextContent(
      "This change was already decided.",
    );
    await userEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
    expect(await screen.findByText("Changed my mind")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Accept change" })).not.toBeInTheDocument();
  });
});

describe("operator: proposing a change", () => {
  it("lists assigned projects and flags open changes", async () => {
    renderApp("/operator/projects", "OPERATOR");
    const irrigation = await screen.findByRole("link", { name: /Smart irrigation controller/ });
    expect(irrigation).toHaveTextContent("Change open");
    expect(screen.getByRole("link", { name: /Biogas digester gas monitor/ })).toHaveTextContent(
      "Saida Mfinanga",
    );
  });

  it("allows only one open change per project", async () => {
    renderApp("/operator/projects/prj_irrigation/changes", "OPERATOR");
    expect(await screen.findByText(/A change is already open on this project/)).toBeVisible();
    expect(screen.queryByRole("button", { name: "Propose a change" })).not.toBeInTheDocument();
  });

  it("needs an accepted agreement first", async () => {
    renderApp("/operator/projects/prj_attendance/changes", "OPERATOR");
    expect(
      await screen.findByText(/The client has not accepted an agreement yet/),
    ).toBeInTheDocument();
  });

  it("sends a scope-only change straight to the client", async () => {
    renderApp("/operator/projects/prj_solar/changes", "OPERATOR");
    await userEvent.click(await screen.findByRole("button", { name: "Propose a change" }));

    expect(screen.getByText("Scope only: this goes straight to the client.")).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText("Short title"), "Add an executive summary");
    await userEvent.type(
      screen.getByLabelText("Why the change is needed"),
      "Your supervisor asked for a one-page summary.",
    );
    await userEvent.click(screen.getByRole("button", { name: "Add an item to “Scope”" }));
    await userEvent.type(
      screen.getByLabelText("Scope: item 4 (English)"),
      "One-page executive summary",
    );
    // Every term in both languages (ADR 0004): the Swahili copy is still missing.
    await userEvent.click(screen.getByRole("button", { name: "Send proposal" }));
    const swahili = screen.getByLabelText("Scope: item 4 (Kiswahili)");
    expect(swahili).toHaveAccessibleDescription("Write this item in both English and Swahili.");
    await userEvent.type(swahili, "Muhtasari wa ukurasa mmoja");
    await userEvent.click(screen.getByRole("button", { name: "Send proposal" }));

    expect(await screen.findByText("CR-2026-0005 sent to the client")).toBeInTheDocument();
    expect(await screen.findByText("Waiting for client decision")).toBeInTheDocument();
    // Types a whole item in two languages key by key: slow when the suite runs in parallel.
  }, 15_000);

  it("sends a price change to an admin first", async () => {
    renderApp("/operator/projects/prj_solar/changes", "OPERATOR");
    await userEvent.click(await screen.findByRole("button", { name: "Propose a change" }));

    await userEvent.type(screen.getByLabelText("Short title"), "Printed and bound copies");
    await userEvent.type(
      screen.getByLabelText("Why the change is needed"),
      "Three bound copies for the department library.",
    );
    const price = screen.getByLabelText("New price (TZS)");
    await userEvent.clear(price);
    await userEvent.type(price, "710,000");
    expect(screen.getByText(/so an admin approves this before the client sees it/)).toBeVisible();
    await userEvent.click(screen.getByRole("button", { name: "Send proposal" }));

    expect(
      await screen.findByText("CR-2026-0005 sent to an admin for approval"),
    ).toBeInTheDocument();
    expect(await screen.findByText("Waiting for admin approval")).toBeInTheDocument();
  });

  it("explains missing fields and a proposal identical to the agreement", async () => {
    renderApp("/operator/projects/prj_solar/changes", "OPERATOR");
    await userEvent.click(await screen.findByRole("button", { name: "Propose a change" }));
    await userEvent.click(screen.getByRole("button", { name: "Send proposal" }));
    expect(screen.getByLabelText("Short title")).toHaveAccessibleDescription(
      /Give the change a short title/,
    );

    await userEvent.type(screen.getByLabelText("Short title"), "Nothing new");
    await userEvent.type(
      screen.getByLabelText("Why the change is needed"),
      "Testing the identical proposal.",
    );
    await userEvent.click(screen.getByRole("button", { name: "Send proposal" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Nothing is different from the current agreement yet.",
    );
  });
});

describe("admin: approving price and deadline changes", () => {
  it("approves a change so the client can see it", async () => {
    renderApp("/admin/projects", "ADMIN");
    await userEvent.click(
      await screen.findByRole("link", { name: /1 change waiting for your approval/ }),
    );

    const card = await screen.findByRole("heading", { name: "Add a methane leak alarm" });
    expect(card.closest("li")?.textContent).toContain(`${tzs(150_000)} more`);
    await userEvent.click(screen.getByRole("button", { name: "Approve for the client" }));
    await userEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", { name: "Approve for the client" }),
    );

    expect(
      await screen.findByText("CR-2026-0004 approved and sent to the client"),
    ).toBeInTheDocument();
    expect(await screen.findByText("Nothing waiting for your approval")).toBeInTheDocument();
  });

  it("does not approve without a reason, and says when another admin decided first", async () => {
    renderApp("/admin/projects/changes", "ADMIN");
    await userEvent.click(await screen.findByRole("button", { name: "Do not approve" }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByRole("button", { name: "Do not approve" })).toBeDisabled();

    await userEvent.type(within(dialog).getByLabelText("Reason for the operator"), "Too costly");
    await changesApi.admin.review("chg_4", { outcome: "APPROVE" });
    await userEvent.click(within(dialog).getByRole("button", { name: "Do not approve" }));

    expect(await within(dialog).findByRole("alert")).toHaveTextContent(
      "This change was already decided.",
    );
  });
});
