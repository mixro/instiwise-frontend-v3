import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import i18n from "@/i18n";
import { ConfirmDialog } from "./ConfirmDialog";

type Props = Partial<Parameters<typeof ConfirmDialog>[0]>;

function Harness(props: Props) {
  const [open, setOpen] = useState(true);
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={setOpen}
      title="Revoke the invitation for Rehema Said?"
      description="The link and code stop working at once."
      confirmLabel="Revoke invitation"
      tone="danger"
      onConfirm={() => {}}
      {...props}
    />
  );
}

describe("ConfirmDialog", () => {
  it("runs the action and closes on success", async () => {
    const onConfirm = vi.fn();
    render(<Harness onConfirm={onConfirm} />);

    expect(
      screen.getByRole("dialog", { name: "Revoke the invitation for Rehema Said?" }),
    ).toHaveAccessibleDescription("The link and code stop working at once.");
    await userEvent.click(screen.getByRole("button", { name: "Revoke invitation" }));

    expect(onConfirm).toHaveBeenCalledWith(undefined);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("does nothing when cancelled (translated Cancel button)", async () => {
    await i18n.changeLanguage("sw");
    const onConfirm = vi.fn();
    render(<Harness onConfirm={onConfirm} />);

    await userEvent.click(screen.getByRole("button", { name: "Ghairi" }));
    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("requires a reason when asked and passes it trimmed", async () => {
    const onConfirm = vi.fn();
    render(<Harness onConfirm={onConfirm} reason={{ label: "Reason for the reversal" }} />);

    const confirm = screen.getByRole("button", { name: "Revoke invitation" });
    expect(confirm).toBeDisabled();

    await userEvent.type(screen.getByLabelText("Reason for the reversal"), "   ");
    expect(confirm).toBeDisabled();

    await userEvent.type(screen.getByLabelText("Reason for the reversal"), "Entered twice ");
    await userEvent.click(confirm);
    expect(onConfirm).toHaveBeenCalledWith("Entered twice");
  });

  it("shows the loading state while the action runs", async () => {
    let finish: () => void = () => {};
    const onConfirm = () =>
      new Promise<void>((resolve) => {
        finish = resolve;
      });
    render(<Harness onConfirm={onConfirm} />);

    await userEvent.click(screen.getByRole("button", { name: "Revoke invitation" }));
    expect(screen.getByRole("button", { name: "Revoke invitation" })).toHaveAttribute(
      "aria-busy",
      "true",
    );
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();

    finish();
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("stays open and shows the error when the action fails", async () => {
    const onConfirm = vi.fn().mockRejectedValue(new Error("PAYMENT_ALREADY_REVERSED"));
    const { rerender } = render(<Harness onConfirm={onConfirm} />);

    await userEvent.click(screen.getByRole("button", { name: "Revoke invitation" }));
    rerender(<Harness onConfirm={onConfirm} error="This payment was already reversed." />);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("This payment was already reversed.");
    expect(screen.getByRole("button", { name: "Revoke invitation" })).toBeEnabled();
  });
});
