import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { renderApp } from "@/test/render-app";
import { SIDEBAR_STORAGE_KEY } from "./SidebarLayout";

const OPERATOR_NAV = [
  "Dashboard",
  "My clients",
  "My projects",
  "Messages",
  "Payment records",
  "Profile",
];

const ADMIN_NAV = [
  "Overview",
  "Clients",
  "Projects",
  "Operators",
  "Finance",
  "Messages",
  "Audit logs",
  "Settings",
];

function sidebar() {
  return within(screen.getByRole("navigation", { name: "Main navigation" }));
}

describe("SidebarLayout", () => {
  it("shows the operator navigation and a breadcrumb for the current page", async () => {
    renderApp("/operator/clients", "OPERATOR");
    await screen.findByRole("heading", { level: 1, name: "My clients" });

    expect(
      sidebar()
        .getAllByRole("link")
        .map((link) => link.textContent),
    ).toEqual(OPERATOR_NAV);
    expect(sidebar().getByRole("link", { name: "My clients" })).toHaveAttribute(
      "aria-current",
      "page",
    );

    const breadcrumb = within(screen.getByRole("navigation", { name: "Breadcrumb" }));
    expect(breadcrumb.getByRole("link", { name: "Operator" })).toHaveAttribute("href", "/operator");
    expect(breadcrumb.getByText("My clients")).toHaveAttribute("aria-current", "page");
  });

  it("shows the admin navigation", async () => {
    renderApp("/admin", "ADMIN");
    await screen.findByRole("heading", { level: 1, name: "Overview" });
    expect(
      sidebar()
        .getAllByRole("link")
        .map((link) => link.textContent),
    ).toEqual(ADMIN_NAV);
  });

  it("has language and theme toggles and a user menu in the top bar", async () => {
    renderApp("/admin", "ADMIN");
    await screen.findByRole("heading", { level: 1 });

    const banner = within(screen.getAllByRole("banner")[0] as HTMLElement);
    expect(banner.getByRole("group", { name: "Language" })).toBeInTheDocument();
    expect(banner.getByRole("group", { name: "Theme" })).toBeInTheDocument();
    expect(banner.getByRole("button", { name: "Rehema Said" })).toBeInTheDocument();
  });

  it("collapses the sidebar to icons, keeps the names as labels, and remembers it", async () => {
    renderApp("/operator", "OPERATOR");
    await screen.findByRole("heading", { level: 1 });

    const collapse = screen.getByRole("button", { name: "Collapse sidebar" });
    expect(collapse).toHaveAttribute("aria-expanded", "true");
    await userEvent.click(collapse);

    const expand = screen.getByRole("button", { name: "Expand sidebar" });
    expect(expand).toHaveAttribute("aria-expanded", "false");
    expect(sidebar().getByRole("link", { name: "Payment records" })).toBeInTheDocument();
    expect(sidebar().queryByText("Payment records")).not.toBeInTheDocument();
    expect(localStorage.getItem(SIDEBAR_STORAGE_KEY)).toBe("collapsed");
  });

  it("opens the navigation in a drawer on small screens and closes it after choosing", async () => {
    renderApp("/operator", "OPERATOR");
    await screen.findByRole("heading", { level: 1 });

    await userEvent.click(screen.getByRole("button", { name: "Open menu" }));
    const drawer = within(screen.getByRole("dialog", { name: "Main navigation" }));
    // The link's name also carries the unread count ("Messages 2 conversations with…").
    await userEvent.click(drawer.getByRole("link", { name: /^Messages/ }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "Messages" })).toBeInTheDocument();
  });

  it("signs out from the user menu", async () => {
    renderApp("/operator", "OPERATOR");
    await screen.findByRole("heading", { level: 1 });

    await userEvent.click(screen.getByRole("button", { name: "Baraka Mushi" }));
    expect(screen.getByRole("menuitem", { name: "Profile" })).toHaveAttribute(
      "href",
      "/operator/profile",
    );
    await userEvent.click(screen.getByRole("menuitem", { name: "Sign out" }));

    expect(await screen.findByRole("heading", { level: 1, name: "Sign in" })).toBeInTheDocument();
  });
});
