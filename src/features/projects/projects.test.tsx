import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { AppRoutes } from "@/app/AppRoutes";
import { AppProviders } from "@/app/providers";
import { clientApi } from "@/features/client/api";
import { MOCK_ROLE_STORAGE_KEY } from "@/lib/session-context";
import { operatorById } from "@/mocks/admin-store";
import { MOCK_OPERATOR_ID } from "@/mocks/staff-seed";
import { renderApp } from "@/test/render-app";
import { projectsApi, type ProjectCreateBody } from "./api";

const term = (en: string, sw: string) => ({ en, sw });

/** A complete draft for Neema (Baraka's client), as the API takes it. */
const draftForNeema = (title: string): ProjectCreateBody => ({
  clientId: "cli_neema",
  title,
  category: "Prototype",
  description: "A gate that opens with a phone call.",
  deliverables: ["Gate controller", "User guide"],
  startDate: "2026-11-02",
  agreement: {
    price: 1_250_000,
    deadline: "2027-01-15",
    scope: [term("GSM gate controller", "Kidhibiti cha geti cha GSM")],
    exclusions: [],
    paymentTerms: [term("Half before work starts", "Nusu kabla ya kazi kuanza")],
  },
});

async function fillField(label: string | RegExp, value: string) {
  await userEvent.type(screen.getByLabelText(label), value);
}

describe("creating projects as an operator", () => {
  it("is not offered without canCreateProjects, and the server refuses", async () => {
    const baraka = operatorById(MOCK_OPERATOR_ID);
    if (!baraka) throw new Error("seed changed");
    baraka.permissions = { canInviteClients: true, canCreateProjects: false };
    localStorage.setItem(
      MOCK_ROLE_STORAGE_KEY,
      JSON.stringify({ role: "OPERATOR", name: "Baraka Mushi", permissions: baraka.permissions }),
    );
    const first = render(
      <AppProviders>
        <MemoryRouter initialEntries={["/operator/projects"]}>
          <AppRoutes />
        </MemoryRouter>
      </AppProviders>,
    );
    await screen.findByRole("heading", { level: 1, name: "My projects" });
    expect(screen.queryByRole("link", { name: "New project" })).not.toBeInTheDocument();
    first.unmount();

    render(
      <AppProviders>
        <MemoryRouter initialEntries={["/operator/projects/new"]}>
          <AppRoutes />
        </MemoryRouter>
      </AppProviders>,
    );
    expect(await screen.findByText("You cannot create projects")).toBeInTheDocument();
    await expect(projectsApi.OPERATOR.create(draftForNeema("Gate opener"))).rejects.toMatchObject({
      code: "PERMISSION_REQUIRED",
      status: 403,
    });
  });

  it("offers only assigned clients, and an unassigned one is refused", async () => {
    renderApp("/operator/projects/new", "OPERATOR");
    const clients = await screen.findByRole("group", { name: "Client" });
    await within(clients).findByText("Neema Mwakyusa");
    expect(within(clients).getByText("Saida Mfinanga")).toBeInTheDocument();
    for (const other of ["Hamisi Kombo", "Grace Lyimo", "Daudi Mrisho"]) {
      expect(within(clients).queryByText(other)).not.toBeInTheDocument();
    }
    await expect(
      projectsApi.OPERATOR.create({ ...draftForNeema("Gate opener"), clientId: "cli_hamisi" }),
    ).rejects.toMatchObject({ code: "CLIENT_NOT_FOUND", status: 404 });
  });

  it("validates inline before anything is sent", async () => {
    renderApp("/operator/projects/new", "OPERATOR");
    await screen.findByRole("group", { name: "Client" });
    await fillField("What is included: item 1 (English)", "Gate controller");
    await userEvent.click(screen.getByRole("button", { name: "Create draft" }));

    expect(await screen.findByText("Choose a client.", { exact: false })).toBeInTheDocument();
    expect(screen.getByLabelText("Project title")).toHaveAttribute("aria-invalid", "true");
    expect(
      screen.getByLabelText("What is included: item 1 (Kiswahili)"),
    ).toHaveAccessibleDescription("Write this item in both English and Swahili.");
    const price = screen.getByLabelText("Price (TZS)");
    await userEvent.type(price, "1250000.50");
    await userEvent.click(screen.getByRole("button", { name: "Create draft" }));
    expect(price).toHaveAttribute("aria-invalid", "true");
  });
});

describe("a draft, from creation to the client's acceptance", () => {
  it("is invisible to the client until sent, then the client can accept it", async () => {
    const user = userEvent.setup();
    const first = renderApp("/operator/projects/new", "OPERATOR");
    const clients = await screen.findByRole("group", { name: "Client" });
    await user.type(within(clients).getByRole("searchbox"), "neema");
    await user.click(await within(clients).findByRole("radio", { name: /Neema Mwakyusa/ }));
    await user.type(screen.getByLabelText("Project title"), "Gate opener for Kibaha farm");
    await user.type(screen.getByLabelText("Type of work"), "Prototype");
    await user.type(screen.getByLabelText("Deliverable 1"), "Gate controller");
    await user.type(screen.getByLabelText("Start date"), "2026-11-02");
    await user.type(screen.getByLabelText("Price (TZS)"), "1,250,000");
    await user.type(screen.getByLabelText("Deadline"), "2027-01-15");
    await user.type(
      screen.getByLabelText("What is included: item 1 (English)"),
      "GSM gate controller",
    );
    await user.type(
      screen.getByLabelText("What is included: item 1 (Kiswahili)"),
      "Kidhibiti cha geti cha GSM",
    );
    await user.type(
      screen.getByLabelText("Payment terms: item 1 (English)"),
      "Half before work starts",
    );
    await user.type(
      screen.getByLabelText("Payment terms: item 1 (Kiswahili)"),
      "Nusu kabla ya kazi kuanza",
    );
    await user.click(screen.getByRole("button", { name: "Create draft" }));

    // The draft page, with the client preview in both languages.
    expect(
      await screen.findByRole("heading", { level: 1, name: "Gate opener for Kibaha farm" }),
    ).toBeInTheDocument();
    const preview = screen.getByRole("region", { name: "Preview: what the client will see" });
    expect(within(preview).getByText("GSM gate controller")).toBeVisible();
    await user.click(within(preview).getByRole("tab", { name: "Kiswahili" }));
    expect(await within(preview).findByText("Kidhibiti cha geti cha GSM")).toBeVisible();

    // The client sees nothing yet.
    const draft = (await clientApi.projects()).find(
      (p) => p.title === "Gate opener for Kibaha farm",
    );
    expect(draft).toBeUndefined();
    const created = (
      await projectsApi.OPERATOR.agreement(
        screen.getByTestId("location").textContent?.split("/")[3] ?? "",
      )
    ).versions[0];
    expect(created?.status).toBe("DRAFT");
    // Not even by its id.
    const draftId = screen.getByTestId("location").textContent?.split("/")[3] ?? "";
    await expect(clientApi.project(draftId)).rejects.toMatchObject({
      code: "PROJECT_NOT_FOUND",
      status: 404,
    });

    await user.click(screen.getByRole("button", { name: "Send to client" }));
    const dialog = await screen.findByRole("dialog", {
      name: "Send agreement version 1 to Neema Mwakyusa?",
    });
    await user.click(within(dialog).getByRole("button", { name: "Send to client" }));
    expect(await screen.findByText("Sent to Neema Mwakyusa")).toBeInTheDocument();
    // Sent: history now, read-only on this page.
    expect(
      await screen.findByText(/Sent to Neema Mwakyusa\. This version can no longer be edited/),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Save draft" })).not.toBeInTheDocument();
    const projectId = screen.getByTestId("location").textContent?.split("/")[3] ?? "";
    first.unmount();

    // Now the client has it, and accepts it.
    renderApp(`/client/projects/${projectId}/agreement`, "CLIENT");
    await user.click(await screen.findByRole("button", { name: "Accept version 1" }));
    const accept = screen.getByRole("dialog", { name: "Accept agreement version 1?" });
    await user.click(within(accept).getByRole("button", { name: "Accept version 1" }));
    expect(await screen.findByText("Agreement version 1 accepted")).toBeInTheDocument();
    // A whole form typed key by key, two dialogs and a second session: longer than 5 s.
  }, 30_000);
});

describe("drafts as an admin", () => {
  it("creates for any client, lists it as Draft, and refuses edits after sending", async () => {
    const created = await projectsApi.ADMIN.create({
      ...draftForNeema("Weather alerts for Daudi"),
      clientId: "cli_daudi",
    });
    expect(created).toMatchObject({ status: "DRAFT", agreement: { status: "DRAFT" } });

    renderApp("/admin/projects", "ADMIN");
    // The table also renders each row as a phone card, so the link appears twice.
    const [link] = await screen.findAllByRole("link", { name: "Weather alerts for Daudi" });
    expect(link).toHaveAttribute("href", `/admin/projects/${created.id}/agreement`);
    expect(link?.closest("tr")).toHaveTextContent("Draft");

    await projectsApi.ADMIN.update(created.id, { title: "Weather SMS alerts for Daudi" });
    await projectsApi.ADMIN.send(created.id);
    await expect(projectsApi.ADMIN.update(created.id, { title: "Too late" })).rejects.toMatchObject(
      { code: "PROJECT_NOT_DRAFT", status: 409 },
    );
    await expect(
      projectsApi.ADMIN.saveDraft(created.id, draftForNeema("x").agreement),
    ).rejects.toMatchObject({ code: "AGREEMENT_NOT_DRAFT", status: 409 });
  });
});
