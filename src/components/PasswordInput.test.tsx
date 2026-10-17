import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import i18n from "@/i18n";
import { PasswordInput } from "./PasswordInput";

describe("PasswordInput", () => {
  it("hides the password until asked, then shows it", async () => {
    render(<PasswordInput id="pw" aria-label="Password" autoComplete="current-password" />);
    const input = screen.getByLabelText("Password");
    expect(input).toHaveAttribute("type", "password");

    const toggle = screen.getByRole("button", { name: "Show password" });
    expect(toggle).toHaveAttribute("aria-pressed", "false");
    expect(toggle).toHaveAttribute("aria-controls", "pw");

    await userEvent.click(toggle);
    expect(input).toHaveAttribute("type", "text");
    expect(screen.getByRole("button", { name: "Hide password" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("labels the toggle in Swahili", async () => {
    await i18n.changeLanguage("sw");
    render(<PasswordInput aria-label="Nenosiri" autoComplete="new-password" />);
    expect(screen.getByRole("button", { name: "Onyesha nenosiri" })).toBeInTheDocument();
  });
});
