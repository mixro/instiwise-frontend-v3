import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { AppRoutes } from "@/app/AppRoutes";
import { AppProviders } from "@/app/providers";
import { operatorApi } from "@/features/operator/api";
import { MOCK_ROLE_STORAGE_KEY, MOCK_SIGNED_OUT } from "@/lib/session-context";
import { operatorById, staffState } from "@/mocks/admin-store";
import { MOCK_OPERATOR_ID } from "@/mocks/staff-seed";
import { renderApp } from "@/test/render-app";
import { invitationsApi } from "./api";

const myInvitations = () => screen.findByRole("table", { name: "My invitations" });
const allInvitations = () => screen.findByRole("table", { name: "Invitations" });

/** Baraka's permission, on the mock server and in his session. */
function signInBarakaWithout() {
  const baraka = operatorById(MOCK_OPERATOR_ID);
  if (!baraka) throw new Error("seed changed");
  baraka.permissions = { canInviteClients: false, canCreateProjects: false };
  localStorage.setItem(
    MOCK_ROLE_STORAGE_KEY,
    JSON.stringify({ role: "OPERATOR", name: "Baraka Mushi", permissions: baraka.permissions }),
  );
  return render(
    <AppProviders>
      <MemoryRouter initialEntries={["/operator/clients"]}>
        <AppRoutes />
      </MemoryRouter>
    </AppProviders>,
  );
}

describe("operator without canInviteClients", () => {
  it("sees no invite action or invitation list, and the server refuses", async () => {
    signInBarakaWithout();
    await screen.findByRole("table", { name: "My clients" });
    expect(screen.queryByRole("button", { name: "Invite client" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "My invitations" })).not.toBeInTheDocument();

    await expect(invitationsApi.operator.list()).rejects.toMatchObject({
      code: "PERMISSION_REQUIRED",
      status: 403,
    });
    await expect(invitationsApi.operator.create("Mwanaidi Juma")).rejects.toMatchObject({
      code: "PERMISSION_REQUIRED",
    });
    await expect(invitationsApi.operator.revoke("MWJ4-7HQA")).rejects.toMatchObject({
      code: "PERMISSION_REQUIRED",
    });
  });
});

describe("operator invitations", () => {
  it("lists only the operator's own invitations, one in each state", async () => {
    renderApp("/operator/clients", "OPERATOR");
    const table = await myInvitations();
    await within(table).findByText("Mwanaidi Juma");

    for (const [name, status] of [
      ["Mwanaidi Juma", "Pending"],
      ["Saida Mfinanga", "Used"],
      ["Peter Massawe", "Expired"],
      ["Kassim Ally", "Revoked"],
    ]) {
      const row = within(table)
        .getByText(name as string)
        .closest("tr") as HTMLElement;
      expect(within(row).getByText(status as string)).toBeInTheDocument();
    }
    // Zawadi's and the admin's never reach Baraka, on screen or through the API.
    for (const other of ["Ally Hassan", "Zuhura Shabani", "Fatuma Ndege", "Juma Kassim"]) {
      expect(within(table).queryByText(other)).not.toBeInTheDocument();
    }
    const codes = (await invitationsApi.operator.list()).map((i) => i.code);
    expect(codes).not.toContain("ALH6-3HSN");
    await expect(invitationsApi.operator.revoke("ALH6-3HSN")).rejects.toMatchObject({
      code: "INVITATION_NOT_FOUND",
      status: 404,
    });
  });

  it("revokes a pending invitation after confirming, and shows it as revoked", async () => {
    renderApp("/operator/clients", "OPERATOR");
    const table = await myInvitations();
    await within(table).findByText("Mwanaidi Juma");

    await userEvent.click(within(table).getByRole("button", { name: "Revoke MWJ4-7HQA" }));
    const dialog = await screen.findByRole("dialog", { name: "Revoke invitation MWJ4-7HQA?" });
    await userEvent.click(within(dialog).getByRole("button", { name: "Revoke invitation" }));

    expect(await screen.findByText("Invitation MWJ4-7HQA revoked")).toBeInTheDocument();
    const row = within(table).getByText("Mwanaidi Juma").closest("tr") as HTMLElement;
    await waitFor(() => expect(within(row).getByText("Revoked")).toBeInTheDocument());
    expect(within(row).getByText("Revoked by Baraka Mushi")).toBeInTheDocument();
    expect(within(row).queryByRole("button", { name: /Revoke/ })).not.toBeInTheDocument();

    // A second attempt is refused: only pending invitations can be revoked.
    await expect(invitationsApi.operator.revoke("MWJ4-7HQA")).rejects.toMatchObject({
      code: "INVITATION_NOT_ACTIVE",
    });
  });

  it("says who the client will be assigned to, validates the label inline", async () => {
    renderApp("/operator/clients", "OPERATOR");
    await userEvent.click(await screen.findByRole("button", { name: "Invite client" }));
    const dialog = await screen.findByRole("dialog", { name: "Invite a client" });

    expect(
      within(dialog).getByText(/When they register, the client is assigned to you/),
    ).toBeInTheDocument();
    const label = within(dialog).getByLabelText(/Who is it for\?/);
    await userEvent.type(label, "x".repeat(101));
    await userEvent.click(within(dialog).getByRole("button", { name: "Create invitation" }));
    expect(label).toHaveAttribute("aria-invalid", "true");
  });

  it("creates a code that registers on /invite, and the client lands with this operator", async () => {
    const user = userEvent.setup();
    const first = renderApp("/operator/clients", "OPERATOR");
    await user.click(await screen.findByRole("button", { name: "Invite client" }));
    const dialog = await screen.findByRole("dialog", { name: "Invite a client" });
    await user.type(within(dialog).getByLabelText(/Who is it for\?/), "Amina Said");
    await user.click(within(dialog).getByRole("button", { name: "Create invitation" }));

    const ready = await screen.findByRole("dialog", { name: "Invitation ready" });
    const code = (within(ready).getByLabelText("Invitation code") as HTMLInputElement).value;
    const link = (within(ready).getByLabelText("Invitation link") as HTMLInputElement).value;
    expect(code).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/);
    expect(link).toMatch(new RegExp(`/invite/${code}$`));

    await user.click(within(ready).getByRole("button", { name: "Copy code" }));
    expect(await navigator.clipboard.readText()).toBe(code);
    expect(within(ready).getByText("Code copied")).toBeInTheDocument();

    const whatsapp = within(ready).getByRole("link", { name: /Share on WhatsApp/ });
    const href = new URL(whatsapp.getAttribute("href") ?? "");
    expect(href.origin + href.pathname).toBe("https://wa.me/");
    expect(href.searchParams.get("text")).toContain(code);
    first.unmount();

    // The invitee, signed out, opens the code.
    renderApp(`/invite/${code}`, null);
    expect(
      await screen.findByText("Baraka Mushi invited you to INSTIWISE as a client."),
    ).toBeInTheDocument();
    await user.type(screen.getByLabelText("Full name"), "Amina Said");
    await user.type(screen.getByLabelText("Email address"), "amina@example.com");
    await user.type(screen.getByLabelText("Create a password"), "mradi2026");
    await user.click(screen.getByRole("button", { name: "Create account" }));
    await user.click(await screen.findByRole("link", { name: "Continue to my home" }));
    expect(await screen.findByRole("heading", { level: 1, name: "Home" })).toBeInTheDocument();

    // Single use, used by Amina, and she is Baraka's client now.
    const used = (await invitationsApi.operator.list()).find((i) => i.code === code);
    expect(used).toMatchObject({ status: "ACCEPTED", acceptedBy: "Amina Said" });
    expect((await operatorApi.clients()).map((c) => c.name)).toContain("Amina Said");
    localStorage.setItem(MOCK_ROLE_STORAGE_KEY, MOCK_SIGNED_OUT);
  });
});

describe("admin invitations", () => {
  it("lists every invitation and filters by inviter and status on the server", async () => {
    renderApp("/admin/clients", "ADMIN");
    // The table is drawn again after each load, so look it up each time.
    await within(await allInvitations()).findByText("Ally Hassan");
    expect(within(await allInvitations()).getByText("Mwanaidi Juma")).toBeInTheDocument();
    expect(within(await allInvitations()).getByText("Fatuma Ndege")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("combobox", { name: "Invited by" }));
    await userEvent.click(await screen.findByRole("option", { name: "Zawadi Mollel" }));
    await waitFor(async () =>
      expect(within(await allInvitations()).queryByText("Mwanaidi Juma")).not.toBeInTheDocument(),
    );
    expect(within(await allInvitations()).getByText("Ally Hassan")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("combobox", { name: "Status" }));
    await userEvent.click(await screen.findByRole("option", { name: "Revoked" }));
    expect(await screen.findByText("No invitations match these filters")).toBeInTheDocument();
  });

  it("invites an operator, and can revoke anyone's invitation", async () => {
    renderApp("/admin/clients", "ADMIN");
    await userEvent.click(await screen.findByRole("button", { name: "Send invitation" }));
    const dialog = await screen.findByRole("dialog", { name: "Send an invitation" });
    await userEvent.click(within(dialog).getByRole("combobox", { name: "Invite as" }));
    await userEvent.click(await screen.findByRole("option", { name: "Operator" }));
    expect(
      within(dialog).getByText(/cannot sign in until an admin approves them/),
    ).toBeInTheDocument();
    expect(within(dialog).queryByText(/Operator for this client/)).not.toBeInTheDocument();
    await userEvent.type(within(dialog).getByLabelText(/Who is it for\?/), "Rose Mbwambo");
    await userEvent.click(within(dialog).getByRole("button", { name: "Create invitation" }));
    await screen.findByRole("dialog", { name: "Invitation ready" });

    const rose = staffState().invitations.find((i) => i.label === "Rose Mbwambo");
    expect(rose).toMatchObject({ role: "OPERATOR", inviter: { name: "Rehema Said" } });

    // Zawadi's pending invitation, revoked by the admin.
    await expect(invitationsApi.admin.revoke("ALH6-3HSN")).resolves.toMatchObject({
      status: "REVOKED",
      revokedBy: "Rehema Said",
    });
  });
});
