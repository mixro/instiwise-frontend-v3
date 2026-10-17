import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { AppProviders } from "@/app/providers";
import { routes } from "@/app/routes";
import { ComponentsPage } from "./ComponentsPage";

// Rendered directly: React Router data routers trip over jsdom's AbortSignal in Node.
function renderPage() {
  return render(
    <AppProviders>
      <ComponentsPage />
    </AppProviders>,
  );
}

describe("/dev/components", () => {
  it("is routed in development builds only", () => {
    expect(routes.some((route) => route.path === "/dev/components")).toBe(import.meta.env.DEV);
  });

  it("shows every section", async () => {
    renderPage();

    expect(await screen.findByRole("heading", { level: 1, name: "Components" })).toBeVisible();
    for (const name of [
      "Button",
      "Input",
      "Select",
      "Table",
      "Dialog",
      "Skeleton",
      "StatusBadge",
      "MoneyCell",
      "EmptyState",
      "ConfirmDialog",
      "PageHeader",
      "Timeline",
      "DataTable",
      "FormField",
    ]) {
      expect(screen.getByRole("heading", { level: 2, name })).toBeInTheDocument();
    }
  });

  it("wires error text to the control it describes", async () => {
    renderPage();
    await screen.findByRole("heading", { level: 1 });

    const invalid = screen
      .getAllByLabelText("Amount received (TZS)")
      .find((input) => input.getAttribute("aria-invalid") === "true");
    expect(invalid).toHaveAccessibleDescription("Enter a whole number of shillings, more than 0.");
  });

  it("switches to Swahili", async () => {
    renderPage();
    await screen.findByRole("heading", { level: 1 });

    await userEvent.click(screen.getByRole("button", { name: /Kiswahili/ }));
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Vipengele");
  });

  it("saves from the dialog, shows the loading state, then a success toast", async () => {
    renderPage();
    await userEvent.click(await screen.findByRole("button", { name: "Open dialog" }));
    await userEvent.click(screen.getByRole("button", { name: "Save payment" }));

    expect(screen.getByRole("button", { name: "Saving…" })).toBeDisabled();
    expect(await screen.findByText("Payment recorded")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("keeps the dialog open and explains a failed save", async () => {
    renderPage();
    await userEvent.click(
      await screen.findByRole("button", { name: "Open dialog that fails to save" }),
    );
    await userEvent.click(screen.getByRole("button", { name: "Save payment" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Payment not saved.");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});
