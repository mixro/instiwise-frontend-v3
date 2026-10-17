import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { AppProviders } from "@/app/providers";
import { mediaState } from "@/test/media";
import { ThemeToggle } from "./ThemeToggle";

function renderToggle() {
  return render(
    <AppProviders>
      <ThemeToggle />
    </AppProviders>,
  );
}

describe("dark mode", () => {
  it("starts light when the system is light and nothing is saved", () => {
    renderToggle();
    expect(document.documentElement).not.toHaveClass("dark");
  });

  it("starts dark when the system prefers dark", () => {
    mediaState.matchesDark = true;
    renderToggle();
    expect(document.documentElement).toHaveClass("dark");
  });

  it("switches to dark and remembers the choice", async () => {
    renderToggle();
    await userEvent.click(screen.getByRole("button", { name: "Dark" }));

    expect(document.documentElement).toHaveClass("dark");
    expect(localStorage.getItem("instiwise.theme")).toBe("dark");
  });

  it("a saved light choice beats a dark system setting", () => {
    mediaState.matchesDark = true;
    localStorage.setItem("instiwise.theme", "light");
    renderToggle();
    expect(document.documentElement).not.toHaveClass("dark");
  });
});
