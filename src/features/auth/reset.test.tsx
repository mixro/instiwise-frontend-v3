import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { adminApi } from "@/features/admin/api";
import { MOCK_ROLE_STORAGE_KEY } from "@/lib/session-context";
import { DEMO_PASSWORD } from "@/mocks/demo-data";
import { RESET_CLIENT_LIMIT } from "@/mocks/reset-codes";
import { renderApp } from "@/test/render-app";
import { completePasswordReset, getResetCode, login } from "./api";

/*
 * Password reset with admin-issued codes (ADR 0005), against the mock backend's
 * demo codes (src/mocks/demo-data.ts): RST2-NEMA works (Neema), RST2-XPRD is
 * expired (Saida), RST2-USED used (Hamisi), RST2-CNCL cancelled (Zawadi),
 * RST2-LOCK locked (Grace).
 */

const NEW_PASSWORD = "Mpya2026pass";
const PEOPLE = /Neema|Saida|Hamisi|Zawadi|Grace|@example\.com/;
const as = (role: "ADMIN" | "OPERATOR" | "CLIENT") =>
  localStorage.setItem(MOCK_ROLE_STORAGE_KEY, role);

describe("checking a code", { timeout: 15_000 }, () => {
  it.each([
    ["RST2-ZZZZ", "This reset code doesn't work"],
    ["RST2-XPRD", "This reset code has expired"],
    ["RST2-USED", "This reset code has already been used"],
    ["RST2-CNCL", "This reset code was cancelled"],
    ["RST2-LOCK", "This reset code is locked"],
    ["not-a-code", "This reset code doesn't work"],
  ])("%s says what happened, and nothing about the account", async (code, title) => {
    renderApp(`/reset/${code}`, null);
    expect(await screen.findByRole("heading", { level: 1, name: title })).toBeVisible();
    expect(document.body.textContent).not.toMatch(PEOPLE);
    expect(screen.getByRole("link", { name: "Enter a different code" })).toHaveAttribute(
      "href",
      "/reset",
    );
  });

  it("reveals only the expiry of a usable code", async () => {
    const check = await getResetCode("RST2-NEMA");
    expect(Object.keys(check).sort()).toEqual(["code", "expiresAt"]);
    renderApp("/reset/RST2-NEMA", null);
    expect(
      await screen.findByRole("heading", { level: 1, name: "Choose a new password" }),
    ).toBeVisible();
    expect(screen.getByText(/This code works once and expires on/)).toBeVisible();
    expect(document.body.textContent).not.toMatch(PEOPLE);
  });
});

describe("resetting", { timeout: 15_000 }, () => {
  it("sets the new password: the old one stops working, the new one signs in", async () => {
    const user = userEvent.setup();
    renderApp("/reset/RST2-NEMA", null);
    await screen.findByRole("heading", { level: 1, name: "Choose a new password" });

    await user.click(screen.getByRole("button", { name: "Save new password" }));
    expect(screen.getByText("Type the new password again.")).toBeVisible();
    await user.type(screen.getByLabelText("New password"), "short1");
    await user.type(screen.getByLabelText("Type the new password again"), "short2");
    await user.click(screen.getByRole("button", { name: "Save new password" }));
    expect(screen.getByText("Use at least 8 characters.")).toBeVisible();
    expect(screen.getByText("The two new passwords are not the same.")).toBeVisible();

    await user.clear(screen.getByLabelText("New password"));
    await user.type(screen.getByLabelText("New password"), NEW_PASSWORD);
    await user.clear(screen.getByLabelText("Type the new password again"));
    await user.type(screen.getByLabelText("Type the new password again"), NEW_PASSWORD);
    await user.click(screen.getByRole("button", { name: "Save new password" }));

    expect(
      await screen.findByRole("heading", { level: 1, name: "Your password has been changed" }),
    ).toBeVisible();
    // Not signed in: sent to sign in.
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/login");
    expect(localStorage.getItem(MOCK_ROLE_STORAGE_KEY)).toBe("SIGNED_OUT");

    await expect(
      login({ email: "neema@example.com", password: DEMO_PASSWORD }),
    ).rejects.toMatchObject({ code: "INVALID_CREDENTIALS" });
    await expect(
      login({ email: "neema@example.com", password: NEW_PASSWORD }),
    ).resolves.toMatchObject({ user: { name: "Neema Mwakyusa" } });
  });

  it("works once", async () => {
    await completePasswordReset("RST2-NEMA", NEW_PASSWORD);
    await expect(completePasswordReset("RST2-NEMA", "Another2026")).rejects.toMatchObject({
      code: "RESET_CODE_ALREADY_USED",
    });
    await expect(getResetCode("RST2-NEMA")).rejects.toMatchObject({ status: 409 });
  });

  it("does not let a suspended operator in afterwards", async () => {
    await completePasswordReset("RST2-FRJI", NEW_PASSWORD);
    await expect(
      login({ email: "faraji@example.com", password: NEW_PASSWORD }),
    ).rejects.toMatchObject({ code: "ACCOUNT_SUSPENDED" });
  });

  it("locks a code after 5 refused attempts", async () => {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await expect(completePasswordReset("RST2-NEMA", "short")).rejects.toMatchObject({
        code: "VALIDATION_FAILED",
      });
    }
    await expect(completePasswordReset("RST2-NEMA", NEW_PASSWORD)).rejects.toMatchObject({
      code: "RESET_CODE_LOCKED",
      status: 410,
    });
    renderApp("/reset/RST2-NEMA", null);
    expect(
      await screen.findByRole("heading", { level: 1, name: "This reset code is locked" }),
    ).toBeVisible();
  });

  it("slows down a browser that keeps trying codes", async () => {
    for (let attempt = 0; attempt < RESET_CLIENT_LIMIT; attempt += 1) {
      await expect(getResetCode(`GUES-${1000 + attempt}`)).rejects.toMatchObject({
        code: "RESET_CODE_NOT_FOUND",
      });
    }
    // Even a good code waits now.
    await expect(getResetCode("RST2-NEMA")).rejects.toMatchObject({
      code: "RATE_LIMITED",
      status: 429,
    });
    renderApp("/reset/RST2-NEMA", null);
    expect(
      await screen.findByRole("heading", { level: 1, name: "Too many attempts" }),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: "Try again" })).toBeVisible();
  });
});

describe("finding the way", { timeout: 15_000 }, () => {
  it("links from sign-in, through /forgot-password, to /reset, which takes a pasted link", async () => {
    const user = userEvent.setup();
    renderApp("/login", null);
    await user.click(await screen.findByRole("link", { name: "Forgot password?" }));
    await user.click(await screen.findByRole("link", { name: "Enter it here" }));
    expect(
      await screen.findByRole("heading", { level: 1, name: "Reset your password" }),
    ).toBeVisible();
    expect(screen.getByText(/Ask your administrator for a reset code/)).toBeVisible();

    const field = screen.getByLabelText("Reset link or code");
    await user.type(field, "hello");
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByText(/doesn't look like a reset link or code/)).toBeVisible();

    await user.clear(field);
    await user.type(field, "Open https://app.instiwise.co.tz/reset/rst2-nema please");
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(
      await screen.findByRole("heading", { level: 1, name: "Choose a new password" }),
    ).toBeVisible();
    expect(screen.getByTestId("location")).toHaveTextContent("/reset/RST2-NEMA");
  });

  it("is for signed-out visitors only", async () => {
    renderApp("/reset/RST2-NEMA", "CLIENT");
    await screen.findByRole("heading", { level: 1 });
    expect(screen.getByTestId("location")).toHaveTextContent(/^\/client$/);
  });
});

describe("admin reset codes", { timeout: 20_000 }, () => {
  it("only an admin may issue or cancel", async () => {
    as("OPERATOR");
    await expect(adminApi.issueResetCode("cli_daudi")).rejects.toMatchObject({
      code: "FORBIDDEN",
      status: 403,
    });
    as("CLIENT");
    await expect(adminApi.cancelResetCode("cli_neema")).rejects.toMatchObject({ status: 403 });
    localStorage.removeItem(MOCK_ROLE_STORAGE_KEY);
    await expect(adminApi.issueResetCode("cli_daudi")).rejects.toMatchObject({ status: 401 });
    as("ADMIN");
    await expect(adminApi.issueResetCode("adm_rehema")).rejects.toMatchObject({
      code: "ACCOUNT_NOT_FOUND",
    });
  });

  it("reissuing cancels the previous code, and the audit log never holds a code", async () => {
    as("ADMIN");
    const first = await adminApi.issueResetCode("cli_neema");
    expect(first.link).toMatch(new RegExp(`/reset/${first.code}$`));
    // Neema's seeded code was cancelled by the first, the first by the second.
    await expect(getResetCode("RST2-NEMA")).rejects.toMatchObject({ code: "RESET_CODE_CANCELLED" });
    const second = await adminApi.issueResetCode("cli_neema");
    await expect(getResetCode(first.code)).rejects.toMatchObject({ code: "RESET_CODE_CANCELLED" });
    await expect(getResetCode(second.code)).resolves.toMatchObject({ code: second.code });

    const clients = await adminApi.clients();
    const neema = clients.find((client) => client.id === "cli_neema");
    expect(neema?.resetCode).toMatchObject({ expiresAt: second.expiresAt });
    expect(JSON.stringify(clients)).not.toContain(second.code);

    await completePasswordReset(second.code, NEW_PASSWORD);
    await adminApi.issueResetCode("cli_daudi");
    await adminApi.cancelResetCode("cli_daudi");
    await expect(adminApi.cancelResetCode("cli_daudi")).rejects.toMatchObject({
      code: "RESET_CODE_NOT_ACTIVE",
    });

    const { entries } = await adminApi.audit({});
    const actions = entries.map((entry) => `${entry.action} ${entry.target}`);
    expect(actions).toEqual(
      expect.arrayContaining([
        "PASSWORD_RESET_CODE_ISSUED Neema Mwakyusa",
        "PASSWORD_RESET_CODE_CANCELLED Neema Mwakyusa",
        "PASSWORD_RESET_COMPLETED Neema Mwakyusa",
        "PASSWORD_RESET_CODE_ISSUED Daudi Mrisho",
        "PASSWORD_RESET_CODE_CANCELLED Daudi Mrisho",
      ]),
    );
    const log = JSON.stringify(entries);
    for (const secret of [first.code, second.code, "RST2-NEMA", NEW_PASSWORD]) {
      expect(log).not.toContain(secret);
    }
  });

  it("shows the code once in the dialog and never again", async () => {
    const user = userEvent.setup();
    renderApp("/admin/clients", "ADMIN");
    const table = await screen.findByRole("table", { name: "Clients" });
    await user.click(
      await within(table).findByRole("button", { name: "Reset password Daudi Mrisho" }),
    );

    let dialog = screen.getByRole("dialog", { name: "Reset the password of Daudi Mrisho?" });
    await user.click(within(dialog).getByRole("button", { name: "Issue reset code" }));
    dialog = await screen.findByRole("dialog", { name: "Reset code for Daudi Mrisho" });
    const code = (within(dialog).getByLabelText("Reset code") as HTMLInputElement).value;
    expect(code).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/);
    expect(within(dialog).getByLabelText("Reset link")).toHaveValue(
      `${window.location.origin}/reset/${code}`,
    );
    const share = within(dialog).getByRole("link", { name: /Share on WhatsApp/ });
    expect(share.getAttribute("href")).toMatch(/^https:\/\/wa\.me\/\?text=/);
    expect(decodeURIComponent(share.getAttribute("href") ?? "")).toContain(code);

    await user.click(within(dialog).getByRole("button", { name: "Done" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    const row = within(table)
      .getByRole("button", { name: "Reset password Daudi Mrisho" })
      .closest("tr") as HTMLElement;
    await waitFor(() => expect(row).toHaveTextContent(/Reset code active until/));
    expect(document.body.textContent).not.toContain(code);

    // Opening it again offers cancel or a new code, never the old one.
    await user.click(within(table).getByRole("button", { name: "Reset password Daudi Mrisho" }));
    dialog = screen.getByRole("dialog", { name: "Daudi Mrisho already has a reset code" });
    expect(dialog).toHaveTextContent("The code itself cannot be shown again.");
    expect(document.body.textContent).not.toContain(code);

    await user.click(within(dialog).getByRole("button", { name: "Cancel code" }));
    expect(await screen.findByText("Reset code for Daudi Mrisho cancelled")).toBeVisible();
    await waitFor(() => expect(row).not.toHaveTextContent(/Reset code active until/));
    await expect(getResetCode(code)).rejects.toMatchObject({ code: "RESET_CODE_CANCELLED" });
  });

  it("is offered on every operator too, whatever their status", async () => {
    renderApp("/admin/operators", "ADMIN");
    // The page opens on operators waiting for approval.
    expect(await screen.findByRole("button", { name: "Reset password Juma Kassim" })).toBeVisible();
  });

  it("is not offered to operators", async () => {
    renderApp("/operator/clients", "OPERATOR");
    await screen.findByRole("heading", { level: 1 });
    await screen.findAllByText("Neema Mwakyusa");
    expect(screen.queryByRole("button", { name: /Reset password/ })).not.toBeInTheDocument();
  });
});
