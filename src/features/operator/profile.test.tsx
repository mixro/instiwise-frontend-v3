import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { login } from "@/features/auth/api";
import { clientApi } from "@/features/client/api";
import { apiClient } from "@/lib/api";
import { operatorById } from "@/mocks/admin-store";
import { DEMO_PASSWORD } from "@/mocks/demo-data";
import { MOCK_OPERATOR_ID } from "@/mocks/staff-seed";
import { renderApp } from "@/test/render-app";
import { operatorApi } from "./api";

const section = (name: string | RegExp) => within(screen.getByRole("region", { name }));

async function openProfile() {
  renderApp("/operator/profile", "OPERATOR");
  await screen.findByRole("region", { name: "Your details" });
}

describe("operator profile", () => {
  it("shows the operator's own details and access, read-only where it must be", async () => {
    await openProfile();
    const details = section("Your details");
    expect(details.getByLabelText("Full name")).toHaveValue("Baraka Mushi");
    expect(details.getByLabelText("Phone number")).toHaveValue("+255 754 321 987");
    // The email has its own section: it changes only after confirming the new one.
    expect(section("Email address").getByText("baraka@example.com")).toBeVisible();
    expect(section("Email address").getByText("Verified")).toBeVisible();
    expect(details.getByLabelText("Role")).toHaveAttribute("readonly");
    expect(details.getByLabelText("Role")).toHaveValue("Operator");

    const access = section("Your access");
    expect(access.getByText("Active")).toBeInTheDocument();
    // A count of his own clients (Neema and Saida), nothing about anyone else.
    expect(access.getByText("2 clients")).toBeInTheDocument();
    const permissions = within(access.getByRole("list", { name: "What you may do" }));
    expect(permissions.getByText("May invite clients").closest("li")).toHaveTextContent("Allowed");
    expect(permissions.getByText("May create projects").closest("li")).toHaveTextContent("Allowed");
    for (const other of ["Hamisi Kombo", "Grace Lyimo", "Daudi Mrisho"]) {
      expect(screen.queryByText(other, { exact: false })).not.toBeInTheDocument();
    }
  });

  it("shows permissions an admin has not granted as not allowed", async () => {
    const baraka = operatorById(MOCK_OPERATOR_ID);
    if (!baraka) throw new Error("seed changed");
    baraka.permissions = { canInviteClients: false, canCreateProjects: true };
    await openProfile();
    const permissions = within(screen.getByRole("list", { name: "What you may do" }));
    expect(permissions.getByText("May invite clients").closest("li")).toHaveTextContent(
      "Not allowed",
    );
  });

  it("saves name and phone, and refuses changes to read-only fields", async () => {
    await openProfile();
    const details = section("Your details");
    const role = details.getByLabelText("Role");
    await userEvent.type(role, "x");
    expect(role).toHaveValue("Operator");

    const phone = details.getByLabelText("Phone number");
    await userEvent.clear(phone);
    await userEvent.type(phone, "12345");
    await userEvent.click(details.getByRole("button", { name: "Save changes" }));
    expect(phone).toHaveAttribute("aria-invalid", "true");
    expect(phone).toHaveAccessibleDescription(/Tanzanian/);

    await userEvent.clear(phone);
    await userEvent.type(phone, "0712 000 111");
    const name = details.getByLabelText("Full name");
    await userEvent.clear(name);
    await userEvent.type(name, "Baraka J. Mushi");
    await userEvent.click(details.getByRole("button", { name: "Save changes" }));

    expect(await screen.findByText("Profile saved")).toBeInTheDocument();
    await expect(operatorApi.profile()).resolves.toMatchObject({
      name: "Baraka J. Mushi",
      phone: "+255712000111",
      email: "baraka@example.com",
    });
    expect(screen.getByRole("button", { name: "Baraka J. Mushi" })).toBeInTheDocument();

    // The server takes only name, phone and language.
    await expect(
      apiClient.PATCH("/operator/profile", {
        body: { email: "someone@example.com" } as never,
      }),
    ).rejects.toMatchObject({ code: "VALIDATION_FAILED", status: 422 });
  });

  it("switches the language at once, saves it, and signs in with it next time", async () => {
    await openProfile();
    await userEvent.click(section("Preferences").getByRole("button", { name: "Kiswahili, sw" }));
    expect(await screen.findByRole("heading", { level: 1, name: "Wasifu" })).toBeInTheDocument();
    expect(document.documentElement).toHaveAttribute("lang", "sw");
    await waitFor(async () => expect((await operatorApi.profile()).preferredLanguage).toBe("sw"));

    const session = await login({ email: "baraka@example.com", password: DEMO_PASSWORD });
    expect(session.user.preferredLanguage).toBe("sw");
  });

  it("changes the password after checking the current one", async () => {
    await openProfile();
    const form = section("Change password");
    const current = form.getByLabelText("Current password");
    const next = form.getByLabelText("New password");
    const again = form.getByLabelText("Repeat the new password");

    await userEvent.type(current, "wrong-password1");
    await userEvent.type(next, "mradi2027");
    await userEvent.type(again, "mradi2028");
    await userEvent.click(form.getByRole("button", { name: "Change password" }));
    expect(again).toHaveAccessibleDescription("The two new passwords are not the same.");

    await userEvent.clear(again);
    await userEvent.type(again, "mradi2027");
    await userEvent.click(form.getByRole("button", { name: "Change password" }));
    await waitFor(() =>
      expect(current).toHaveAccessibleDescription("The current password is not correct."),
    );

    await userEvent.clear(current);
    await userEvent.type(current, DEMO_PASSWORD);
    await userEvent.click(form.getByRole("button", { name: "Change password" }));
    expect(
      await screen.findByText("Password changed. Your other devices were signed out."),
    ).toBeInTheDocument();
    expect(current).toHaveValue("");

    await expect(
      login({ email: "baraka@example.com", password: DEMO_PASSWORD }),
    ).rejects.toMatchObject({ code: "INVALID_CREDENTIALS" });
    await expect(
      login({ email: "baraka@example.com", password: "mradi2027" }),
    ).resolves.toMatchObject({ user: { name: "Baraka Mushi" } });
  });
});

describe("client account language", () => {
  it("saves the language chosen on the Account page", async () => {
    renderApp("/client/account", "CLIENT");
    await screen.findByLabelText("Full name");
    await userEvent.click(section("Preferences").getByRole("button", { name: "Kiswahili, sw" }));
    await waitFor(async () => expect((await clientApi.profile()).preferredLanguage).toBe("sw"));
    // Name and phone are kept.
    await expect(clientApi.profile()).resolves.toMatchObject({
      name: "Neema Mwakyusa",
      phone: "+255713456789",
    });
  });
});
