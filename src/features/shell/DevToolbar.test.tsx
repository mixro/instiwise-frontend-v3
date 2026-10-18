import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { MOCK_ROLE_STORAGE_KEY } from "@/lib/session-context";
import { renderApp } from "@/test/render-app";

describe("DevToolbar (mock role switcher)", () => {
  it("switches role and lands on that role's home", async () => {
    renderApp("/client/payments", "CLIENT");
    await screen.findByRole("heading", { level: 1, name: "Payments and receipts" });

    await userEvent.click(screen.getByRole("combobox", { name: /^Mock role/ }));
    await userEvent.click(screen.getByRole("option", { name: "Admin" }));

    expect(await screen.findByRole("heading", { level: 1, name: "Overview" })).toBeInTheDocument();
    expect(screen.getByTestId("location")).toHaveTextContent("/admin");
    expect(localStorage.getItem(MOCK_ROLE_STORAGE_KEY)).toBe("ADMIN");
  });

  it("can sign the mock user out", async () => {
    renderApp("/operator", "OPERATOR");
    await screen.findByRole("heading", { level: 1 });

    await userEvent.click(screen.getByRole("combobox", { name: /^Mock role/ }));
    await userEvent.click(screen.getByRole("option", { name: "Signed out" }));

    expect(await screen.findByRole("heading", { level: 1, name: "Sign in" })).toBeInTheDocument();
  });

  it("reports the API status", async () => {
    renderApp("/client", "CLIENT");
    const toolbar = await screen.findByText("Mock role (demo and development only)");
    expect(
      await within(toolbar.parentElement as HTMLElement).findByText("API connected, version mock"),
    ).toBeInTheDocument();
  });
});
