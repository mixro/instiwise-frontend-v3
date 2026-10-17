import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";
import { formatTzs } from "@/lib/format";
import { renderApp } from "@/test/render-app";
import { server } from "@/test/server";

// Amounts contain no-break spaces, which getByText would normalise away.
const tzs = (amount: number) => formatTzs(amount, "en");
const pageText = () => document.body.textContent ?? "";

async function openProject(path: string, title: string) {
  renderApp(path, "CLIENT");
  return screen.findByRole("heading", { level: 1, name: title });
}

describe("client home", () => {
  it("shows the balance the server computed, actions, unread messages and progress", async () => {
    renderApp("/client", "CLIENT");
    const balance = await screen.findByRole("region", { name: "Your balance" });

    // Accepted agreements only: 1,850,000 + 650,000 agreed, 1,750,000 paid.
    expect(balance.textContent).toContain(tzs(750_000));
    expect(balance.textContent).toContain(tzs(1_750_000));
    expect(balance.textContent).toContain(tzs(2_500_000));

    const actions = screen.getByRole("region", { name: "Needs your action" });
    expect(within(actions).getByRole("link", { name: "Review the agreement" })).toHaveAttribute(
      "href",
      "/client/projects/prj_attendance/agreement",
    );

    const unread = screen.getByRole("region", { name: "Unread messages" });
    expect(within(unread).getAllByRole("link")).toHaveLength(2);
    expect(within(unread).getByText("2 unread")).toBeInTheDocument();

    const progress = screen.getByRole("region", { name: "Latest progress" });
    const items = within(progress).getAllByRole("listitem");
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent("Tank level alerts working");
  });

  it("greets the client in Swahili too", async () => {
    renderApp("/client", "CLIENT");
    await screen.findByRole("region", { name: "Your balance" });
    await userEvent.click(screen.getAllByRole("button", { name: /Kiswahili/ })[0] as HTMLElement);
    expect(screen.getByText(/Habari, Neema/)).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Salio lako" })).toBeInTheDocument();
  });
});

describe("my projects", () => {
  it("lists every project with its money in words", async () => {
    renderApp("/client/projects", "CLIENT");
    await screen.findByText("Smart irrigation controller for Kibaha farm");

    const cards = screen.getAllByRole("link", { name: /PRJ-2026/ });
    expect(cards).toHaveLength(3);
    expect(pageText()).toContain(`${tzs(750_000)} still to pay`);
    expect(screen.getByText("Fully paid")).toBeInTheDocument();
    expect(
      screen.getByText("The price is agreed once you accept the agreement."),
    ).toBeInTheDocument();
  });
});

describe("project detail", () => {
  it("opens on Overview with deliverables and the WhatsApp shortcut", async () => {
    await openProject(
      "/client/projects/prj_irrigation",
      "Smart irrigation controller for Kibaha farm",
    );

    expect(screen.getByRole("tab", { name: "Overview" })).toHaveAttribute("aria-selected", "true");
    expect(await screen.findByText("Tank level sensor with SMS alerts")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Chat with Baraka Mushi on WhatsApp/ }),
    ).toHaveAttribute("href", "https://wa.me/255754321987");
  });

  it("moves between tabs and changes the URL", async () => {
    await openProject("/client/projects/prj_solar/overview", "Final year report: solar water pump");
    await userEvent.click(screen.getByRole("tab", { name: "Progress" }));

    expect(await screen.findByText("Final report delivered")).toBeInTheDocument();
    expect(screen.getByTestId("location")).toHaveTextContent("/client/projects/prj_solar/progress");
  });

  it("shows the accepted agreement and the version it replaced", async () => {
    await openProject(
      "/client/projects/prj_irrigation/agreement",
      "Smart irrigation controller for Kibaha farm",
    );

    expect(await screen.findByRole("heading", { name: "Version 2" })).toBeInTheDocument();
    expect(screen.getByText(/Accepted by Neema Mwakyusa/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Accept version/ })).not.toBeInTheDocument();
    expect(screen.getByText("Replaced by a newer version")).toBeInTheDocument();
  });

  it("lets the client accept an agreement after confirming", async () => {
    await openProject(
      "/client/projects/prj_attendance/agreement",
      "RFID attendance system for a secondary school",
    );

    await userEvent.click(await screen.findByRole("button", { name: "Accept version 1" }));
    const dialog = screen.getByRole("dialog", { name: "Accept agreement version 1?" });
    expect(dialog.textContent).toContain(tzs(980_000));

    await userEvent.click(within(dialog).getByRole("button", { name: "Accept version 1" }));

    expect(await screen.findByText("Agreement version 1 accepted")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText(/Accepted by Neema Mwakyusa/)).toBeInTheDocument());
    expect(screen.getAllByText("Active").length).toBeGreaterThan(0);
  });

  it("explains an agreement that can no longer be accepted", async () => {
    server.use(
      http.post("/api/client/projects/:id/agreement/versions/:version/acceptance", () =>
        HttpResponse.json(
          { error: { code: "AGREEMENT_NOT_AWAITING_ACCEPTANCE", message: "x" } },
          { status: 409 },
        ),
      ),
    );
    await openProject(
      "/client/projects/prj_attendance/agreement",
      "RFID attendance system for a secondary school",
    );
    await userEvent.click(await screen.findByRole("button", { name: "Accept version 1" }));
    await userEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", { name: "Accept version 1" }),
    );

    expect(await within(screen.getByRole("dialog")).findByRole("alert")).toBeInTheDocument();
  });

  it("shows the conversation, clears unread and sends a message", async () => {
    await openProject(
      "/client/projects/prj_irrigation/messages",
      "Smart irrigation controller for Kibaha farm",
    );

    const conversation = await screen.findByRole("list", { name: "Conversation" });
    expect(within(conversation).getAllByRole("listitem")).toHaveLength(6);
    // Opening the conversation reads it.
    await waitFor(() =>
      expect(screen.getByRole("tab", { name: "Messages" })).not.toHaveTextContent("unread"),
    );

    await userEvent.type(
      screen.getByLabelText("Write a message"),
      "Yes, my brother will be there.",
    );
    await userEvent.click(screen.getByRole("button", { name: "Send" }));

    expect(await within(conversation).findByText("Yes, my brother will be there.")).toBeVisible();
    await waitFor(() => expect(within(conversation).getAllByRole("listitem")).toHaveLength(7));
    expect(screen.getByLabelText("Write a message")).toHaveValue("");
  });

  it("keeps a message that failed to send, with a retry", async () => {
    await openProject("/client/projects/prj_solar/messages", "Final year report: solar water pump");
    await screen.findByRole("list", { name: "Conversation" });

    // "[[" types a literal "[" (userEvent reads [key] as a key name).
    await userEvent.type(screen.getByLabelText("Write a message"), "Hello [[fail]");
    await userEvent.click(screen.getByRole("button", { name: "Send" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Not sent.");

    // The next attempt goes through.
    server.use(
      http.post("/api/client/projects/:id/messages", () =>
        HttpResponse.json(
          {
            id: "m_ok",
            body: "Hello [fail]",
            sentAt: new Date().toISOString(),
            senderName: "Neema Mwakyusa",
            mine: true,
          },
          { status: 201 },
        ),
      ),
    );
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument());
  });

  it("opens a receipt from the payments tab", async () => {
    await openProject(
      "/client/projects/prj_irrigation/payments",
      "Smart irrigation controller for Kibaha farm",
    );

    const [receiptButton] = await screen.findAllByRole("button", {
      name: "View receipt RC-2026-0047",
    });
    await userEvent.click(receiptButton as HTMLElement);

    const sheet = await screen.findByRole("dialog", { name: "Receipt RC-2026-0047" });
    await within(sheet).findByText("CRDB FT26283XK1", { exact: false });
    expect(sheet.textContent).toContain(tzs(500_000));
    // 600,000 + 500,000 paid of 1,850,000.
    expect(sheet.textContent).toContain(tzs(750_000));
    expect(within(sheet).getByText(/not a confirmation from a bank/)).toBeInTheDocument();
  });

  it("downloads a document through a signed link", async () => {
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    await openProject(
      "/client/projects/prj_solar/documents",
      "Final year report: solar water pump",
    );

    await userEvent.click(
      await screen.findByRole("button", { name: "Download Presentation slides.pptx" }),
    );
    await waitFor(() => expect(click).toHaveBeenCalledOnce());
    const link = click.mock.instances[0] as unknown as HTMLAnchorElement;
    expect(link.download).toBe("Presentation slides.pptx");
    expect(link.href).toBe("blob:mock");
  });

  it("shows an empty documents state", async () => {
    await openProject(
      "/client/projects/prj_attendance/documents",
      "RFID attendance system for a secondary school",
    );
    expect(await screen.findByText("No documents yet")).toBeInTheDocument();
  });

  it("shows the 404 page for a project that is not the client's", async () => {
    renderApp("/client/projects/prj_someone_else", "CLIENT");
    expect(
      await screen.findByRole("heading", { level: 1, name: "Page not found" }),
    ).toBeInTheDocument();
  });
});

describe("payments and receipts page", () => {
  it("lists every payment across projects with the totals", async () => {
    renderApp("/client/payments", "CLIENT");
    await screen.findAllByRole("button", { name: /View receipt RC-2026-0031/ });

    const table = screen.getByRole("table", { name: "Recorded payments" });
    expect(within(table).getAllByRole("row")).toHaveLength(5);
    expect(within(table).getByRole("columnheader", { name: "Project" })).toBeInTheDocument();
    expect(pageText()).toContain(tzs(750_000));
  });
});

describe("account", () => {
  it("edits name and phone; the email is read-only", async () => {
    renderApp("/client/account", "CLIENT");
    const name = await screen.findByLabelText("Full name");
    expect(screen.getByLabelText("Email address")).toHaveAttribute("readonly");
    expect(screen.getByLabelText(/Phone number/)).toHaveValue("+255 713 456 789");

    await userEvent.clear(name);
    await userEvent.type(name, "Neema J. Mwakyusa");
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));

    expect(await screen.findByText("Profile saved")).toBeInTheDocument();
    expect(name).toHaveValue("Neema J. Mwakyusa");
  });

  it("explains an invalid phone number", async () => {
    renderApp("/client/account", "CLIENT");
    const phone = await screen.findByLabelText(/Phone number/);
    await userEvent.clear(phone);
    await userEvent.type(phone, "12345");
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));

    expect(phone).toHaveAccessibleDescription(/Enter a Tanzanian number/);
  });
});
