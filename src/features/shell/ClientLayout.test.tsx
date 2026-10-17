import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { renderApp } from "@/test/render-app";

const CLIENT_TABS = ["Home", "Projects", "Payments", "Account"];

describe("ClientLayout", () => {
  it("has the four client tabs in both the bottom bar and the desktop header", async () => {
    renderApp("/client", "CLIENT");
    await screen.findByRole("heading", { level: 1 });

    // Bottom bar (phones) and header links (md and up); CSS shows one at a time.
    const navs = screen.getAllByRole("navigation", { name: "Main navigation" });
    expect(navs).toHaveLength(2);
    for (const nav of navs) {
      expect(
        within(nav)
          .getAllByRole("link")
          .map((link) => link.textContent),
      ).toEqual(CLIENT_TABS);
    }
  });

  it("marks the current tab and moves between tabs", async () => {
    renderApp("/client", "CLIENT");
    await screen.findByRole("heading", { level: 1, name: "Home" });

    const [bottomBar] = screen.getAllByRole("navigation", { name: "Main navigation" }).slice(-1);
    const bar = within(bottomBar as HTMLElement);
    expect(bar.getByRole("link", { name: "Home" })).toHaveAttribute("aria-current", "page");

    await userEvent.click(bar.getByRole("link", { name: "Payments" }));
    expect(
      screen.getByRole("heading", { level: 1, name: "Payments and receipts" }),
    ).toBeInTheDocument();
    expect(bar.getByRole("link", { name: "Payments" })).toHaveAttribute("aria-current", "page");
    expect(bar.getByRole("link", { name: "Home" })).not.toHaveAttribute("aria-current");
  });

  it("puts language, theme and sign-out on the Account page", async () => {
    renderApp("/client/account", "CLIENT");
    await screen.findByRole("heading", { level: 1, name: "Account" });

    const preferences = within(screen.getByRole("region", { name: "Preferences" }));
    expect(preferences.getByRole("group", { name: "Language" })).toBeInTheDocument();
    expect(preferences.getByRole("group", { name: "Theme" })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Sign out" }));
    expect(await screen.findByRole("heading", { level: 1, name: "Sign in" })).toBeInTheDocument();
  });

  it("translates the navigation", async () => {
    renderApp("/client", "CLIENT");
    await screen.findByRole("heading", { level: 1 });

    await userEvent.click(screen.getAllByRole("button", { name: /Kiswahili/ })[0] as HTMLElement);
    const [nav] = screen.getAllByRole("navigation", { name: "Urambazaji mkuu" });
    expect(
      within(nav as HTMLElement)
        .getAllByRole("link")
        .map((l) => l.textContent),
    ).toEqual(["Nyumbani", "Miradi", "Malipo", "Akaunti"]);
  });
});
