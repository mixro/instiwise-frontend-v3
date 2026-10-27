import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { adminApi } from "@/features/admin/api";
import { ApiError } from "@/lib/api";
import { MOCK_ROLE_STORAGE_KEY, type SessionUser } from "@/lib/session-context";
import { DEMO_PASSWORD } from "@/mocks/demo-data";
import { emailStatus, markUnverified } from "@/mocks/email";
import { sentMails } from "@/mocks/mailbox";
import { server } from "@/test/server";
import { renderApp } from "@/test/render-app";
import {
  completeEmailPasswordReset,
  confirmEmail,
  getMe,
  getPasswordReset,
  login,
  requestPasswordReset,
  resendVerification,
} from "./api";

/*
 * Email verification and password reset by email (ADR 0006), against the mock
 * backend's demo data (src/mocks/demo-data.ts): Daudi has not confirmed his
 * address, Saida is changing hers, Asha is suspended, and there are demo links
 * in every state.
 */

const LINKS = {
  verifyDaudi: "demo-verify-daudi-valid-4Fq8Zr2LmN7xPw",
  verifyExpired: "demo-verify-juma-expired-9Kd3Vt6QsB1yHc",
  verifyUsed: "demo-verify-neema-used-2Wp5Gx8RnJ4mLa",
  resetNeema: "demo-reset-neema-valid-8Mv2Ka5PxQ7cRe",
  resetCancelled: "demo-reset-neema-cancelled-3Lr6Ds9FqZ2nTw",
  resetExpired: "demo-reset-baraka-expired-5Nb9Wc2GtV6hJs",
  resetUsed: "demo-reset-rehema-used-1Qz4Xf7BdK3pMy",
};
const NEW_PASSWORD = "Mpya2026pass";
const DAUDI: SessionUser = { role: "CLIENT", name: "Daudi Mrisho", email: "daudi@example.com" };
const NEEMA: SessionUser = { role: "CLIENT", name: "Neema Mwakyusa", email: "neema@example.com" };

const signedInAs = (person: SessionUser) =>
  localStorage.setItem(MOCK_ROLE_STORAGE_KEY, JSON.stringify(person));

/** The newest mock email to this address, as a path in the app. */
const lastMailTo = (address: string) => sentMails().find((mail) => mail.to === address);

afterEach(() => {
  vi.useRealTimers();
});

describe("asking for a reset", { timeout: 20_000 }, () => {
  it.each([
    ["neema@example.com", "a verified account"],
    ["nobody@example.com", "no account"],
    ["daudi@example.com", "an unverified address"],
    ["asha@example.com", "a suspended account"],
  ])("answers the same for %s (%s)", async (email) => {
    const user = userEvent.setup();
    renderApp("/forgot-password", null);
    await user.type(await screen.findByLabelText("Email address"), email);
    await user.click(screen.getByRole("button", { name: "Send reset link" }));
    expect(
      await screen.findByRole("heading", { level: 1, name: "Check your email" }),
    ).toBeVisible();
    expect(
      screen.getByText(
        `If an account exists for ${email}, we sent it a link to choose a new password. The link works for 1 hour. Check your spam folder too.`,
      ),
    ).toBeVisible();
  });

  it("only emails a verified address that can sign in, with an identical API answer", async () => {
    const before = sentMails().length;
    for (const email of [
      "nobody@example.com",
      "daudi@example.com",
      "asha@example.com",
      "neema@example.com",
    ]) {
      await expect(requestPasswordReset(email)).resolves.toBeUndefined();
    }
    const sent = sentMails().slice(0, sentMails().length - before);
    expect(sent.map((mail) => `${mail.kind} ${mail.to}`)).toEqual(["RESET neema@example.com"]);
  });

  it("shows the wait when asked too often", async () => {
    await requestPasswordReset("neema@example.com");
    const user = userEvent.setup();
    renderApp("/forgot-password", null);
    await user.type(await screen.findByLabelText("Email address"), "neema@example.com");
    await user.click(screen.getByRole("button", { name: "Send reset link" }));
    expect(await screen.findByText(/Too many requests\. Try again in \d+ seconds\./)).toBeVisible();
  });

  it("links to the admin reset code as a fallback", async () => {
    renderApp("/forgot-password", null);
    expect(await screen.findByRole("link", { name: "Enter it here" })).toHaveAttribute(
      "href",
      "/reset",
    );
  });
});

describe("resetting with the emailed link", { timeout: 20_000 }, () => {
  it.each([
    [LINKS.resetCancelled, "A newer link replaced this one"],
    [LINKS.resetExpired, "This link has expired"],
    [LINKS.resetUsed, "This link has already been used"],
    ["not-a-real-link-but-long-enough-000000", "This link doesn't work"],
    ["short", "This link doesn't work"],
  ])("explains %s", async (token, title) => {
    renderApp(`/reset-password/${token}`, null);
    expect(await screen.findByRole("heading", { level: 1, name: title })).toBeVisible();
    expect(document.body.textContent).not.toMatch(/Neema|Baraka|Rehema|@example\.com/);
  });

  it("changes the password once, signs out every session, and leads to sign in", async () => {
    // Neema is signed in somewhere else.
    signedInAs(NEEMA);
    await expect(getMe()).resolves.toMatchObject({ email: "neema@example.com" });

    const user = userEvent.setup();
    renderApp(`/reset-password/${LINKS.resetNeema}`, null);
    expect(
      await screen.findByRole("heading", { level: 1, name: "Choose a new password" }),
    ).toBeVisible();
    await user.type(screen.getByLabelText("New password"), NEW_PASSWORD);
    await user.type(screen.getByLabelText("Type the new password again"), NEW_PASSWORD);
    await user.click(screen.getByRole("button", { name: "Save new password" }));
    expect(
      await screen.findByRole("heading", { level: 1, name: "Your password has been changed" }),
    ).toBeVisible();
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/login");

    await expect(
      login({ email: "neema@example.com", password: DEMO_PASSWORD }),
    ).rejects.toMatchObject({
      code: "INVALID_CREDENTIALS",
    });
    // The other session ended.
    signedInAs(NEEMA);
    await expect(getMe()).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
    await expect(completeEmailPasswordReset(LINKS.resetNeema, "Another2026")).rejects.toMatchObject(
      {
        code: "RESET_TOKEN_USED",
      },
    );
    await expect(
      login({ email: "neema@example.com", password: NEW_PASSWORD }),
    ).resolves.toMatchObject({
      user: { name: "Neema Mwakyusa" },
    });
  });

  it("signs out a browser whose session a reset ended", async () => {
    await completeEmailPasswordReset(LINKS.resetNeema, NEW_PASSWORD);
    renderApp("/client", NEEMA);
    expect(await screen.findByRole("heading", { level: 1, name: "Sign in" })).toBeVisible();
  });

  it("a new request cancels the previous link", async () => {
    await requestPasswordReset("neema@example.com");
    const newest = lastMailTo("neema@example.com");
    expect(newest?.kind).toBe("RESET");
    await expect(getPasswordReset(LINKS.resetNeema)).rejects.toMatchObject({
      code: "RESET_TOKEN_CANCELLED",
    });
    const token = newest?.path.split("/").pop() ?? "";
    await expect(getPasswordReset(token)).resolves.toHaveProperty("expiresAt");
  });
});

describe("confirming an email address", { timeout: 20_000 }, () => {
  it("does nothing on opening the link, only on Confirm", async () => {
    const posts: string[] = [];
    const listener = ({ request }: { request: Request }) => {
      if (request.method === "POST") posts.push(new URL(request.url).pathname);
    };
    server.events.on("request:start", listener);
    const user = userEvent.setup();
    renderApp(`/verify-email/${LINKS.verifyDaudi}`, null);
    const confirm = await screen.findByRole("button", { name: "Confirm my email address" });
    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(posts).toEqual([]);
    expect(emailStatus("daudi@example.com").emailVerified).toBe(false);

    await user.click(confirm);
    expect(
      await screen.findByRole("heading", { level: 1, name: "Email address confirmed" }),
    ).toBeVisible();
    expect(posts).toEqual([`/api/auth/email-verifications/${LINKS.verifyDaudi}`]);
    expect(emailStatus("daudi@example.com").emailVerified).toBe(true);
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/login");
    server.events.removeListener("request:start", listener);
  });

  it.each([
    [LINKS.verifyExpired, "This link has expired"],
    [LINKS.verifyUsed, "Already confirmed"],
    ["not-a-real-link-but-long-enough-000000", "This link doesn't work"],
  ])("explains %s after Confirm", async (token, title) => {
    const user = userEvent.setup();
    renderApp(`/verify-email/${token}`, null);
    await user.click(await screen.findByRole("button", { name: "Confirm my email address" }));
    expect(await screen.findByRole("heading", { level: 1, name: title })).toBeVisible();
  });

  it("offers a new link by address when expired and signed out", async () => {
    const user = userEvent.setup();
    renderApp(`/verify-email/${LINKS.verifyExpired}`, null);
    await user.click(await screen.findByRole("button", { name: "Confirm my email address" }));
    await screen.findByRole("heading", { level: 1, name: "This link has expired" });
    await user.type(screen.getByLabelText("Email address"), "juma@example.com");
    await user.click(screen.getByRole("button", { name: "Resend email" }));
    expect(await screen.findByText("Sent. Check your inbox.")).toBeVisible();
    expect(lastMailTo("juma@example.com")?.kind).toBe("VERIFY");
  });
});

describe("the reminder banner", { timeout: 20_000 }, () => {
  it.each([
    ["the client layout", "/client", DAUDI],
    [
      "the staff layout",
      "/operator",
      { role: "OPERATOR", name: "Juma Kassim", email: "juma@example.com" } as SessionUser,
    ],
  ])("shows in %s for an unverified user", async (_layout, path, person) => {
    renderApp(path, person);
    const banner = await screen.findByRole("region", { name: "Email not confirmed" });
    expect(banner).toHaveTextContent(`Confirm your email address ${person.email ?? ""}`);
  });

  it("shows in the admin layout too", async () => {
    markUnverified("rehema@example.com");
    renderApp("/admin", "ADMIN");
    expect(await screen.findByRole("region", { name: "Email not confirmed" })).toBeVisible();
  });

  it("does not show for a verified user", async () => {
    renderApp("/client", "CLIENT");
    await screen.findByRole("heading", { level: 1, name: "Home" });
    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(screen.queryByRole("region", { name: "Email not confirmed" })).not.toBeInTheDocument();
  });

  it("disappears once the address is confirmed", async () => {
    const user = userEvent.setup();
    renderApp(`/verify-email/${LINKS.verifyDaudi}`, DAUDI);
    await user.click(await screen.findByRole("button", { name: "Confirm my email address" }));
    await user.click(await screen.findByRole("link", { name: "Continue" }));
    await screen.findByRole("heading", { level: 1, name: "Home" });
    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(screen.queryByRole("region", { name: "Email not confirmed" })).not.toBeInTheDocument();
  });

  it("resends with a 60-second cooldown and at most 5 per hour", async () => {
    signedInAs(DAUDI);
    vi.useFakeTimers({ toFake: ["Date"] });
    const start = Date.now();
    for (let send = 0; send < 5; send += 1) {
      vi.setSystemTime(start + send * 61_000);
      await expect(resendVerification()).resolves.toMatchObject({ sentTo: "daudi@example.com" });
      if (send === 0) {
        await expect(resendVerification()).rejects.toMatchObject({
          code: "RATE_LIMITED",
          retryAfterSeconds: 60,
        });
      }
    }
    vi.setSystemTime(start + 5 * 61_000);
    // The sixth in an hour: the wait is until the first one is an hour old.
    const sixth: unknown = await resendVerification().catch((error: unknown) => error);
    expect(sixth).toBeInstanceOf(ApiError);
    expect(sixth).toMatchObject({ code: "RATE_LIMITED" });
    expect((sixth as ApiError).retryAfterSeconds).toBeGreaterThan(60);
    vi.setSystemTime(start + 61 * 60_000);
    await expect(resendVerification()).resolves.toMatchObject({ sentTo: "daudi@example.com" });
  });

  it("counts down on the button after a resend", async () => {
    const user = userEvent.setup();
    renderApp("/client", DAUDI);
    const banner = await screen.findByRole("region", { name: "Email not confirmed" });
    await user.click(within(banner).getByRole("button", { name: "Resend email" }));
    expect(
      await within(banner).findByText("Sent to daudi@example.com. Check your inbox."),
    ).toBeVisible();
    const button = within(banner).getByRole("button", { name: /^Resend in \d+ seconds$/ });
    expect(button).toBeDisabled();
  });
});

describe("changing the email address", { timeout: 30_000 }, () => {
  it("keeps the old address until the new one is confirmed", async () => {
    const user = userEvent.setup();
    renderApp("/client/account", "CLIENT");
    const section = await screen.findByRole("region", { name: "Email address" });
    await user.click(within(section).getByRole("button", { name: "Change email" }));
    await user.type(within(section).getByLabelText("New email address"), "neema@example.com");
    await user.click(within(section).getByRole("button", { name: "Send confirmation link" }));
    expect(within(section).getByText("That is already your email address.")).toBeVisible();

    await user.clear(within(section).getByLabelText("New email address"));
    await user.type(within(section).getByLabelText("New email address"), "neema.m@example.com");
    await user.type(within(section).getByLabelText("Current password"), "wrong-pass1");
    await user.click(within(section).getByRole("button", { name: "Send confirmation link" }));
    expect(await within(section).findByText(/current password is not correct/i)).toBeVisible();

    await user.clear(within(section).getByLabelText("Current password"));
    await user.type(within(section).getByLabelText("Current password"), DEMO_PASSWORD);
    await user.click(within(section).getByRole("button", { name: "Send confirmation link" }));
    expect(await within(section).findByText("Waiting for confirmation")).toBeVisible();
    expect(section).toHaveTextContent(
      "We sent a link to neema.m@example.com. Until you confirm it, keep signing in with neema@example.com.",
    );

    // Until confirmed, the old address signs in and the new one does not.
    await expect(
      login({ email: "neema@example.com", password: DEMO_PASSWORD }),
    ).resolves.toBeTruthy();
    await expect(
      login({ email: "neema.m@example.com", password: DEMO_PASSWORD }),
    ).rejects.toMatchObject({ code: "INVALID_CREDENTIALS" });

    const token = lastMailTo("neema.m@example.com")?.path.split("/").pop() ?? "";
    await expect(confirmEmail(token)).resolves.toEqual({
      email: "neema.m@example.com",
      changed: true,
    });
    await expect(
      login({ email: "neema.m@example.com", password: DEMO_PASSWORD }),
    ).resolves.toBeTruthy();
    await expect(
      login({ email: "neema@example.com", password: DEMO_PASSWORD }),
    ).rejects.toMatchObject({
      code: "INVALID_CREDENTIALS",
    });
  });

  it("can cancel a pending change, and its link stops working", async () => {
    const user = userEvent.setup();
    const saida: SessionUser = {
      role: "CLIENT",
      name: "Saida Mfinanga",
      email: "saida@example.com",
    };
    signedInAs(saida);
    await expect(getMe()).resolves.toMatchObject({ pendingEmail: "saida.mfinanga@example.com" });

    renderApp("/operator/profile", "OPERATOR");
    const section = await screen.findByRole("region", { name: "Email address" });
    await user.click(within(section).getByRole("button", { name: "Change email" }));
    await user.type(within(section).getByLabelText("New email address"), "baraka.m@example.com");
    await user.type(within(section).getByLabelText("Current password"), DEMO_PASSWORD);
    await user.click(within(section).getByRole("button", { name: "Send confirmation link" }));
    await within(section).findByText("Waiting for confirmation");
    const token = lastMailTo("baraka.m@example.com")?.path.split("/").pop() ?? "";

    await user.click(within(section).getByRole("button", { name: "Cancel change" }));
    const dialog = await screen.findByRole("dialog", {
      name: "Cancel the change to baraka.m@example.com?",
    });
    await user.click(within(dialog).getByRole("button", { name: "Cancel change" }));
    expect(await screen.findByText("Email change cancelled")).toBeVisible();
    await waitFor(() => expect(within(section).queryByText("Waiting for confirmation")).toBeNull());
    expect(within(section).getByRole("button", { name: "Change email" })).toBeVisible();
    await expect(confirmEmail(token)).rejects.toMatchObject({ code: "VERIFICATION_TOKEN_INVALID" });
  });
});

describe("admins", { timeout: 20_000 }, () => {
  it("see who has confirmed an address, without it blocking approval", async () => {
    renderApp("/admin/clients", "ADMIN");
    const table = await screen.findByRole("table", { name: "Clients" });
    const row = (name: string) =>
      within(table)
        .getByRole("button", { name: `Reset password ${name}` })
        .closest("tr") as HTMLElement;
    await within(table).findByRole("button", { name: "Reset password Daudi Mrisho" });
    expect(row("Daudi Mrisho")).toHaveTextContent("Email not verified");
    expect(row("Neema Mwakyusa")).toHaveTextContent("Email verified");
  });

  it("see it on waiting operators, who can still be approved", async () => {
    renderApp("/admin/operators", "ADMIN");
    const approve = await screen.findAllByRole("button", { name: "Approve" });
    const juma = approve[0]?.closest("li") as HTMLElement;
    expect(juma).toHaveTextContent("Juma Kassim");
    expect(juma).toHaveTextContent("Email not verified");
    expect(approve[0]).toBeEnabled();
  });

  it("find every step in the audit log, without tokens or passwords", async () => {
    signedInAs(DAUDI);
    await resendVerification();
    await confirmEmail(LINKS.verifyDaudi).catch(() => undefined);
    await requestPasswordReset("neema@example.com");
    const reset = lastMailTo("neema@example.com")?.path.split("/").pop() ?? "";
    await completeEmailPasswordReset(reset, NEW_PASSWORD);

    localStorage.setItem(MOCK_ROLE_STORAGE_KEY, "ADMIN");
    const { entries } = await adminApi.audit({});
    const actions = entries.map((entry) => `${entry.action} ${entry.target}`);
    expect(actions).toEqual(
      expect.arrayContaining([
        "EMAIL_VERIFICATION_SENT Daudi Mrisho",
        "PASSWORD_RESET_REQUESTED Neema Mwakyusa",
        "PASSWORD_RESET_COMPLETED Neema Mwakyusa",
      ]),
    );
    const log = JSON.stringify(entries);
    for (const secret of [reset, LINKS.verifyDaudi, NEW_PASSWORD, DEMO_PASSWORD]) {
      expect(log).not.toContain(secret);
    }
  });
});
