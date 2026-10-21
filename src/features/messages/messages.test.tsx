import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { staffState } from "@/mocks/admin-store";
import { renderApp } from "@/test/render-app";
import { messagesApi } from "./api";

const conversationList = () => screen.findByRole("list", { name: "Conversations" });
const navMessages = () =>
  screen.getAllByRole("link", { name: /^Messages/ }).find((link) => link.closest("aside"));

describe("operator inbox", () => {
  it("lists only assigned clients' conversations, never anyone else's", async () => {
    renderApp("/operator/messages", "OPERATOR");
    const list = await conversationList();
    expect(within(list).getAllByText("Neema Mwakyusa").length).toBeGreaterThan(0);
    expect(within(list).getByText("Saida Mfinanga")).toBeInTheDocument();
    for (const other of ["Hamisi Kombo", "Grace Lyimo", "Weather station for Chalinze school"]) {
      expect(screen.queryByText(other, { exact: false })).not.toBeInTheDocument();
    }

    const page = await messagesApi.operator.conversations({});
    expect(page.items.map((c) => c.projectId)).not.toContain("prj_weather");
    expect(page.items.map((c) => c.projectId)).not.toContain("prj_hostel");
    // Hamisi's unread message does not count either.
    expect(page.unreadTotal).toBe(2);
    await expect(messagesApi.operator.messages("prj_weather")).rejects.toMatchObject({
      code: "PROJECT_NOT_FOUND",
      status: 404,
    });
    await expect(messagesApi.operator.send("prj_hostel", "Habari")).rejects.toMatchObject({
      status: 404,
    });
  });

  it("marks a conversation read on opening, clearing its badge and the nav count", async () => {
    renderApp("/operator/messages", "OPERATOR");
    const list = await conversationList();
    const saida = within(list).getByRole("link", { name: /Saida Mfinanga/ });
    expect(saida).toHaveTextContent("1 unread");
    await waitFor(() =>
      expect(navMessages()).toHaveAccessibleName("Messages 2 conversations with unread messages"),
    );

    await userEvent.click(saida);
    expect(
      await screen.findByText("Asante. Can the alarm also flash a light? The kitchen is noisy."),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(within(list).getByRole("link", { name: /Saida Mfinanga/ })).not.toHaveTextContent(
        "unread",
      ),
    );
    await waitFor(() =>
      expect(navMessages()).toHaveAccessibleName("Messages 1 conversation with unread messages"),
    );
  });

  it("marks a conversation read when opened from a direct link too", async () => {
    renderApp("/operator/messages/prj_irrigation", "OPERATOR");
    await screen.findByText("Great. I have sent the second payment by bank.");
    await waitFor(async () =>
      expect(
        within(await conversationList()).getByRole("link", {
          name: /Smart irrigation controller for Kibaha farm/,
        }),
      ).not.toHaveTextContent("unread"),
    );
    const page = await messagesApi.operator.conversations({});
    expect(page.items.find((c) => c.projectId === "prj_irrigation")?.unreadCount).toBe(0);
    expect(page.unreadTotal).toBe(1);
  });

  it("filters to unread conversations and searches by project", async () => {
    renderApp("/operator/messages", "OPERATOR");
    await conversationList();
    await userEvent.click(screen.getByRole("button", { name: "Unread" }));
    await waitFor(async () =>
      expect(within(await conversationList()).getAllByRole("listitem")).toHaveLength(2),
    );

    await userEvent.click(screen.getByRole("button", { name: "All" }));
    await userEvent.type(screen.getByRole("searchbox", { name: "Search conversations" }), "biogas");
    await userEvent.click(screen.getByRole("button", { name: "Search" }));
    await waitFor(async () =>
      expect(within(await conversationList()).getAllByRole("listitem")).toHaveLength(1),
    );
    expect(within(await conversationList()).getByText(/Biogas digester gas monitor/)).toBeVisible();
  });

  it("sends a reply that the client then sees in the same conversation", async () => {
    const first = renderApp("/operator/messages/prj_irrigation", "OPERATOR");
    await screen.findByText("Great. I have sent the second payment by bank.");
    await userEvent.type(
      screen.getByLabelText("Write a message"),
      "Payment received, asante. See you on Friday.",
    );
    await userEvent.click(screen.getByRole("button", { name: "Send" }));
    const conversation = await screen.findByRole("list", { name: "Conversation" });
    await waitFor(() =>
      expect(
        within(conversation).getByText("Payment received, asante. See you on Friday."),
      ).toBeVisible(),
    );
    first.unmount();

    renderApp("/client/projects/prj_irrigation/messages", "CLIENT");
    const clientView = await screen.findByRole("list", { name: "Conversation" });
    const reply = await within(clientView).findByText(
      "Payment received, asante. See you on Friday.",
    );
    expect(reply.closest("li")).toHaveTextContent("Baraka Mushi");
  });
});

describe("admin inbox", () => {
  it("lists every conversation, and opening one shows the audit note and no send box", async () => {
    const before = staffState().audit.length;
    renderApp("/admin/messages", "ADMIN");
    const list = await conversationList();
    const hamisi = within(list).getByRole("link", { name: /Hamisi Kombo/ });
    expect(hamisi).toHaveTextContent("Operator: Zawadi Mollel");
    // Admins see the operator's unread: Hamisi waits for an answer.
    expect(hamisi).toHaveTextContent("1 waiting");

    await userEvent.click(within(list).getByRole("link", { name: /Hamisi Kombo/ }));
    expect(await screen.findByText(/Your access is recorded/)).toBeVisible();
    expect(
      await screen.findByText(
        "The rain gauge reads zero after yesterday's storm. Can someone check it?",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Write a message")).not.toBeInTheDocument();
    expect(screen.getByText(/Read-only: admins cannot reply/)).toBeInTheDocument();

    const actions = staffState()
      .audit.slice(before)
      .map((entry) => `${entry.action} ${entry.target}`);
    expect(actions).toContain("CONVERSATION_LIST_VIEWED conversations");
    expect(actions).toContain("CONVERSATION_VIEWED PRJ-2026-011");

    // Reading as admin marks nothing read: Hamisi still waits for the operator.
    const page = await messagesApi.admin.conversations({});
    expect(page.items.find((c) => c.projectId === "prj_weather")?.unreadCount).toBe(1);
  });
});
