import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { renderApp } from "@/test/render-app";

const location = () => screen.getByTestId("location");

async function fill(fields: Record<string, string>) {
  for (const [label, value] of Object.entries(fields)) {
    await userEvent.type(screen.getByLabelText(label), value);
  }
}

describe("invitation entry", () => {
  it("accepts a pasted link and opens that invitation", async () => {
    renderApp("/invite", null);
    await screen.findByRole("heading", { level: 1, name: "Enter your invitation" });

    await userEvent.type(
      screen.getByLabelText("Invitation link or code"),
      "https://app.instiwise.co.tz/invite/kx7p-m4q2",
    );
    await userEvent.click(screen.getByRole("button", { name: "Continue" }));

    expect(
      await screen.findByRole("heading", { level: 1, name: "Create your client account" }),
    ).toBeInTheDocument();
    expect(location()).toHaveTextContent("/invite/KX7P-M4Q2");
  });

  it("explains input that is neither a link nor a code", async () => {
    renderApp("/invite", null);
    await screen.findByRole("heading", { level: 1 });

    await userEvent.type(screen.getByLabelText("Invitation link or code"), "hello");
    await userEvent.click(screen.getByRole("button", { name: "Continue" }));

    expect(screen.getByLabelText("Invitation link or code")).toHaveAccessibleDescription(
      /doesn't look like an invitation link or code/,
    );
    expect(location()).toHaveTextContent(/^\/invite$/);
  });
});

describe("invitation states", () => {
  it.each([
    ["/invite/ZZZZ-9999", "This invitation doesn't exist"],
    ["/invite/not-a-code", "This invitation doesn't exist"],
    ["/invite/EXPD-2026", "This invitation has expired"],
    ["/invite/RVKD-2026", "This invitation was cancelled"],
    ["/invite/USED-2026", "This invitation has already been used"],
  ])("%s shows “%s”", async (path, title) => {
    renderApp(path, null);
    expect(await screen.findByRole("heading", { level: 1, name: title })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Enter a different code" })).toHaveAttribute(
      "href",
      "/invite",
    );
  });

  it("offers sign-in for an invitation that was already used", async () => {
    renderApp("/invite/USED-2026", null);
    await screen.findByRole("heading", { level: 1, name: "This invitation has already been used" });
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/login");
  });

  it("shows who invited the person, without project details", async () => {
    renderApp("/invite/OPR8-T2QW", null);
    expect(
      await screen.findByText(
        "Baraka Mushi invited you to join the INSTIWISE team as an operator.",
      ),
    ).toBeInTheDocument();
  });
});

describe("client registration", () => {
  it("validates the fields with the client rules", async () => {
    renderApp("/invite/KX7P-M4Q2", null);
    await screen.findByRole("heading", { level: 1, name: "Create your client account" });

    expect(screen.getByText("(optional)")).toBeInTheDocument();
    await fill({ "Create a password": "12345678" });
    await userEvent.click(screen.getByRole("button", { name: "Create account" }));

    expect(screen.getByLabelText("Full name")).toHaveAccessibleDescription("Enter your full name.");
    expect(screen.getByLabelText("Email address")).toHaveAccessibleDescription(
      "Enter your email address.",
    );
    expect(screen.getByLabelText("Phone number", { exact: false })).not.toHaveAttribute(
      "aria-invalid",
    );
    expect(screen.getByLabelText("Create a password")).toHaveAccessibleDescription(
      /Include at least one letter\./,
    );
  });

  it("creates the account without a phone and signs the client in", async () => {
    renderApp("/invite/KX7P-M4Q2", null);
    await screen.findByRole("heading", { level: 1, name: "Create your client account" });

    await fill({
      "Full name": "Amani Kweka",
      "Email address": "amani@example.com",
      "Create a password": "mradi2026",
    });
    await userEvent.click(screen.getByRole("button", { name: "Create account" }));

    // Signed in, first told where the confirmation link went (ADR 0006).
    expect(
      await screen.findByRole("heading", { level: 1, name: "Check your email" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/We sent a link to amani@example.com/)).toBeVisible();
    expect(screen.getByRole("button", { name: "Resend email" })).toBeVisible();
    await userEvent.click(screen.getByRole("link", { name: "Continue to my home" }));
    expect(await screen.findByRole("heading", { level: 1, name: "Home" })).toBeInTheDocument();
    expect(location()).toHaveTextContent("/client");
  });

  it("puts 'email already registered' on the email field", async () => {
    renderApp("/invite/KX7P-M4Q2", null);
    await screen.findByRole("heading", { level: 1, name: "Create your client account" });

    await fill({
      "Full name": "Neema Mwakyusa",
      "Email address": "neema@example.com",
      "Create a password": "mradi2026",
    });
    await userEvent.click(screen.getByRole("button", { name: "Create account" }));

    const email = await screen.findByLabelText("Email address");
    expect(
      await screen.findByText(/An account with this email address already exists/),
    ).toBeVisible();
    expect(email).toHaveAttribute("aria-invalid", "true");
    expect(email).toHaveFocus();
  });
});

describe("operator registration", () => {
  it("requires a phone number", async () => {
    renderApp("/invite/OPR8-T2QW", null);
    await screen.findByRole("heading", { level: 1, name: "Create your operator account" });

    expect(screen.queryByText("(optional)")).not.toBeInTheDocument();
    await fill({
      "Full name": "Zawadi Mollel",
      "Email address": "zawadi@example.com",
      "Create a password": "mradi2026",
    });
    await userEvent.click(screen.getByRole("button", { name: "Create account" }));

    expect(screen.getByLabelText("Phone number")).toHaveAccessibleDescription(
      /Enter your phone number\./,
    );
  });

  it("registers, then waits for approval and cannot sign in yet", async () => {
    renderApp("/invite/OPR8-T2QW", null);
    await screen.findByRole("heading", { level: 1, name: "Create your operator account" });

    await fill({
      "Full name": "Zawadi Mollel",
      "Email address": "zawadi@example.com",
      "Phone number": "0687 123 456",
      "Create a password": "mradi2026",
    });
    await userEvent.click(screen.getByRole("button", { name: "Create account" }));

    expect(
      await screen.findByRole("heading", { level: 1, name: "Check your email" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/An admin also needs to approve your account/)).toBeVisible();

    // Signing in before approval lands on the waiting page.
    await userEvent.click(screen.getByRole("link", { name: "Back to sign in" }));
    await fill({ "Email address": "zawadi@example.com", Password: "mradi2026" });
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: "Your account is waiting for approval",
      }),
    ).toBeInTheDocument();
  });

  it("shows the used-invitation state if the code is used twice", async () => {
    renderApp("/invite/KX7P-M4Q2", null);
    await screen.findByRole("heading", { level: 1, name: "Create your client account" });
    await fill({
      "Full name": "Amani Kweka",
      "Email address": "amani@example.com",
      "Create a password": "mradi2026",
    });
    await userEvent.click(screen.getByRole("button", { name: "Create account" }));
    await userEvent.click(await screen.findByRole("link", { name: "Continue to my home" }));
    await screen.findByRole("heading", { level: 1, name: "Home" });

    // The same code again, after signing out.
    await userEvent.click(screen.getAllByRole("link", { name: "Account" })[0] as HTMLElement);
    await userEvent.click(await screen.findByRole("button", { name: "Sign out" }));
    await userEvent.click(await screen.findByRole("link", { name: "Enter your link or code" }));
    await userEvent.type(screen.getByLabelText("Invitation link or code"), "KX7P-M4Q2");
    await userEvent.click(screen.getByRole("button", { name: "Continue" }));

    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: "This invitation has already been used",
      }),
    ).toBeInTheDocument();
  });
});
