import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderApp } from "@/test/render-app";

const location = () => screen.getByTestId("location");

describe("routing and role guards", () => {
  it.each([
    ["CLIENT", "/client", "Home"],
    ["OPERATOR", "/operator", "Dashboard"],
    ["ADMIN", "/admin", "Overview"],
  ] as const)("sends %s from / to their home", async (role, home, title) => {
    renderApp("/", role);
    expect(await screen.findByRole("heading", { level: 1, name: title })).toBeInTheDocument();
    expect(location()).toHaveTextContent(home);
  });

  it.each([
    ["CLIENT", "/admin/finance"],
    ["CLIENT", "/admin/finance?tab=analytics"],
    ["CLIENT", "/operator/clients"],
    ["CLIENT", "/operator/finance?tab=reports"],
    ["OPERATOR", "/client/payments"],
    ["OPERATOR", "/admin/audit-logs"],
    ["ADMIN", "/client/account"],
    ["ADMIN", "/operator/payments"],
  ] as const)("shows %s the no-access page on %s", async (role, path) => {
    renderApp(path, role);
    expect(await screen.findByRole("link", { name: "Go to my home page" })).toBeVisible();
    expect(location()).toHaveTextContent(/^\/no-access$/);
  });

  it("opens a role's own pages", async () => {
    // Every operator and admin nav item has its screen now; none is a placeholder.
    renderApp("/operator/profile", "OPERATOR");
    expect(await screen.findByRole("heading", { level: 1, name: "Profile" })).toBeVisible();
    expect(screen.queryByText("This screen is not built yet")).not.toBeInTheDocument();
  });

  it("sends signed-out visitors to sign-in", async () => {
    renderApp("/operator/clients", null);
    expect(await screen.findByRole("heading", { level: 1, name: "Sign in" })).toBeInTheDocument();
    expect(location()).toHaveTextContent("/login");
  });

  it("offers sign-in on the no-access page when signed out", async () => {
    renderApp("/no-access", null);
    expect(await screen.findByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/login");
    expect(screen.queryByRole("link", { name: "Go to my home page" })).not.toBeInTheDocument();
  });

  it("keeps signed-in people away from the sign-in page", async () => {
    renderApp("/login", "ADMIN");
    expect(await screen.findByRole("heading", { level: 1, name: "Overview" })).toBeInTheDocument();
    expect(location()).toHaveTextContent("/admin");
  });

  it("offers the way home on the no-access page when signed in", async () => {
    renderApp("/no-access", "OPERATOR");
    expect(await screen.findByRole("link", { name: "Go to my home page" })).toHaveAttribute(
      "href",
      "/",
    );
  });

  it("shows a standalone 404 for unknown paths", async () => {
    renderApp("/nowhere", "CLIENT");
    expect(
      await screen.findByRole("heading", { level: 1, name: "Page not found" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: "Main navigation" })).not.toBeInTheDocument();
  });

  it("shows the 404 inside the layout for unknown paths in a role's area", async () => {
    renderApp("/operator/nowhere", "OPERATOR");
    expect(
      await screen.findByRole("heading", { level: 1, name: "Page not found" }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("navigation", { name: "Main navigation" }).length).toBeGreaterThan(
      0,
    );
    expect(screen.getByRole("navigation", { name: "Breadcrumb" })).toHaveTextContent(
      "Page not found",
    );
  });
});
