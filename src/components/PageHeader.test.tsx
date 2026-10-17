import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PageHeader } from "./PageHeader";

describe("PageHeader", () => {
  it("renders the page title as the h1", () => {
    render(<PageHeader title="Payment records" />);
    expect(screen.getByRole("heading", { level: 1, name: "Payment records" })).toBeInTheDocument();
  });

  it("shows the description, badge and actions", () => {
    render(
      <PageHeader
        title="Smart irrigation controller"
        description="Neema Mwakyusa · assigned to Baraka Mushi"
        badge={<span>Active</span>}
        actions={<button type="button">Record payment</button>}
      />,
    );

    expect(screen.getByText("Neema Mwakyusa · assigned to Baraka Mushi")).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Record payment" })).toBeInTheDocument();
  });

  it("can render an h2 when nested inside another page", () => {
    render(<PageHeader level={2} title="Payments" />);
    expect(screen.getByRole("heading", { level: 2, name: "Payments" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 1 })).not.toBeInTheDocument();
  });
});
