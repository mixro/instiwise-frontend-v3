import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AppProviders } from "@/app/providers";
import { useToast } from "@/hooks/useToast";

function RecordButton() {
  const { toast } = useToast();
  return (
    <button
      type="button"
      onClick={() =>
        toast({
          variant: "success",
          title: "Payment recorded",
          description: "Receipt RC-2026-0014 is ready.",
        })
      }
    >
      Record
    </button>
  );
}

describe("Toaster", () => {
  it("shows a toast from useToast() and dismisses it with the close button", async () => {
    render(
      <AppProviders>
        <RecordButton />
      </AppProviders>,
    );

    await userEvent.click(screen.getByRole("button", { name: "Record" }));
    expect(screen.getByText("Payment recorded")).toBeInTheDocument();
    expect(screen.getByText("Receipt RC-2026-0014 is ready.")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByText("Payment recorded")).not.toBeInTheDocument();
  });

  it("fails loudly when used outside the provider", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<RecordButton />)).toThrow("useToast must be used inside <Toaster>");
  });
});
