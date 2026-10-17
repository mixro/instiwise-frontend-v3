import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { AppProviders } from "@/app/providers";
import i18n from "@/i18n";
import { Button } from "./Button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./Dialog";

function renderDialog() {
  return render(
    <AppProviders>
      <Dialog>
        <DialogTrigger asChild>
          <Button>Record payment</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record a payment?</DialogTitle>
            <DialogDescription>A receipt is issued when you save.</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </AppProviders>,
  );
}

describe("Dialog", () => {
  it("opens from its trigger with an accessible title and description", async () => {
    renderDialog();
    await userEvent.click(screen.getByRole("button", { name: "Record payment" }));

    const dialog = screen.getByRole("dialog", { name: "Record a payment?" });
    expect(dialog).toHaveAccessibleDescription("A receipt is issued when you save.");
  });

  it("closes with the translated close button and with Escape", async () => {
    await i18n.changeLanguage("sw");
    renderDialog();

    await userEvent.click(screen.getByRole("button", { name: "Record payment" }));
    await userEvent.click(screen.getByRole("button", { name: "Funga" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Record payment" }));
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
