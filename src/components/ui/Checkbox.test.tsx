import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Checkbox } from "./Checkbox";
import { Label } from "./Label";

describe("Checkbox with Label", () => {
  it("toggles when the label is clicked", async () => {
    render(
      <>
        <Checkbox id="checked" />
        <Label htmlFor="checked">I have checked the client&apos;s payment</Label>
      </>,
    );

    const checkbox = screen.getByRole("checkbox", { name: "I have checked the client's payment" });
    expect(checkbox).not.toBeChecked();

    await userEvent.click(screen.getByText("I have checked the client's payment"));
    expect(checkbox).toBeChecked();
  });

  it("cannot be changed when disabled", async () => {
    render(<Checkbox aria-label="Confirm" disabled />);
    const checkbox = screen.getByRole("checkbox", { name: "Confirm" });

    await userEvent.click(checkbox);
    expect(checkbox).not.toBeChecked();
  });
});
