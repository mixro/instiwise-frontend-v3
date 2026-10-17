import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { DEMO_PASSWORD } from "@/mocks/demo-data";
import { renderApp } from "@/test/render-app";
import { server } from "@/test/server";

async function signIn(email: string, password: string) {
  await userEvent.type(screen.getByLabelText("Email address"), email);
  await userEvent.type(screen.getByLabelText("Password"), password);
  await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
}

describe("LoginPage", () => {
  it("shows inline messages for empty fields without calling the server", async () => {
    renderApp("/login", null);
    await screen.findByRole("heading", { level: 1, name: "Sign in" });

    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));

    const email = screen.getByLabelText("Email address");
    expect(email).toHaveAttribute("aria-invalid", "true");
    expect(email).toHaveAccessibleDescription("Enter your email address.");
    expect(email).toHaveFocus();
    expect(screen.getByLabelText("Password")).toHaveAccessibleDescription("Enter your password.");
  });

  it("updates messages as you type after the first submit, in Swahili too", async () => {
    renderApp("/login", null);
    await screen.findByRole("heading", { level: 1 });
    await userEvent.click(screen.getAllByRole("button", { name: /Kiswahili/ })[0] as HTMLElement);

    const email = screen.getByLabelText("Barua pepe");
    await userEvent.type(email, "neema@");
    // Leaving a field does not judge it yet.
    await userEvent.tab();
    expect(email).not.toHaveAttribute("aria-invalid");

    await userEvent.click(screen.getByRole("button", { name: "Ingia" }));
    expect(email).toHaveAccessibleDescription("Weka barua pepe kama jina@example.com.");

    await userEvent.type(email, "example.com");
    expect(email).not.toHaveAttribute("aria-invalid");
  });

  it("signs a client in and opens their home", async () => {
    renderApp("/login", null);
    await screen.findByRole("heading", { level: 1 });
    await signIn("neema@example.com", DEMO_PASSWORD);

    expect(await screen.findByRole("heading", { level: 1, name: "Home" })).toBeInTheDocument();
    expect(screen.getByTestId("location")).toHaveTextContent("/client");
  });

  it("returns to the page that asked for sign-in", async () => {
    renderApp("/operator/payments", null);
    await screen.findByRole("heading", { level: 1, name: "Sign in" });
    await signIn("baraka@example.com", DEMO_PASSWORD);

    expect(
      await screen.findByRole("heading", { level: 1, name: "Payment records" }),
    ).toBeInTheDocument();
  });

  it.each([
    ["neema@example.com", "wrong-password1", "The email address or password is wrong."],
    ["asha@example.com", DEMO_PASSWORD, "This account is suspended."],
    ["busy@example.com", DEMO_PASSWORD, "Too many attempts."],
  ])("explains a refused sign-in for %s", async (email, password, message) => {
    renderApp("/login", null);
    await screen.findByRole("heading", { level: 1 });
    await signIn(email, password);

    expect(await screen.findByRole("alert")).toHaveTextContent(message);
    expect(screen.getByRole("heading", { level: 1, name: "Sign in" })).toBeInTheDocument();
  });

  it("sends an operator awaiting approval to the pending page", async () => {
    renderApp("/login", null);
    await screen.findByRole("heading", { level: 1 });
    await signIn("juma@example.com", DEMO_PASSWORD);

    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: "Your account is waiting for approval",
      }),
    ).toBeInTheDocument();
  });

  it("says when the server cannot be reached", async () => {
    server.use(http.post("/api/auth/login", () => HttpResponse.error()));
    renderApp("/login", null);
    await screen.findByRole("heading", { level: 1 });
    await signIn("neema@example.com", DEMO_PASSWORD);

    expect(await screen.findByRole("alert")).toHaveTextContent("Can't reach INSTIWISE.");
  });

  it("never shows the server's own message for unknown errors", async () => {
    server.use(
      http.post("/api/auth/login", () =>
        HttpResponse.json(
          { error: { code: "SOMETHING_NEW", message: "stack trace here" } },
          { status: 500 },
        ),
      ),
    );
    renderApp("/login", null);
    await screen.findByRole("heading", { level: 1 });
    await signIn("neema@example.com", DEMO_PASSWORD);

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Something went wrong on our side.");
    expect(alert).not.toHaveTextContent("stack trace");
  });
});
