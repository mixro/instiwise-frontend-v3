import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { EmptyState } from "./EmptyState";

describe("EmptyState", () => {
  it("shows the title, description and action", async () => {
    const onClick = vi.fn();
    render(
      <EmptyState
        title="No payments recorded yet"
        description="Payments appear here once an operator records them."
        action={
          <button type="button" onClick={onClick}>
            Record payment
          </button>
        }
      />,
    );

    expect(screen.getByText("No payments recorded yet")).toBeInTheDocument();
    expect(screen.getByText("Payments appear here once an operator records them.")).toBeVisible();
    await userEvent.click(screen.getByRole("button", { name: "Record payment" }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("works with a title only", () => {
    const { container } = render(<EmptyState title="No messages in this project" />);
    expect(screen.getByText("No messages in this project")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(container.querySelectorAll("p")).toHaveLength(1);
  });

  it("marks the danger tone on the title for load errors", () => {
    render(<EmptyState tone="danger" title="Payments could not be loaded." />);
    expect(screen.getByText("Payments could not be loaded.")).toHaveClass("text-danger-fg");
  });
});
