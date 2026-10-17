import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import i18n from "@/i18n";
import { formatTzs } from "@/lib/format";
import { MoneyCell } from "./MoneyCell";

// Compared via textContent: Intl puts no-break spaces in currency output, which
// Testing Library's text matchers would normalise away.
function renderAmount(amount: number): HTMLElement {
  const { container } = render(<MoneyCell amount={amount} />);
  return container.firstElementChild as HTMLElement;
}

describe("MoneyCell", () => {
  it("formats whole TZS with lib/format, right-aligned in tabular figures", () => {
    const cell = renderAmount(1_250_000);
    expect(cell.textContent).toBe(formatTzs(1_250_000, "en"));
    expect(cell).toHaveClass("text-right", "tabular", "whitespace-nowrap");
  });

  it("follows the active language", async () => {
    await i18n.changeLanguage("sw");
    expect(renderAmount(450_000).textContent).toBe(formatTzs(450_000, "sw"));
  });

  it("shows reversals as negative amounts and zero as zero", () => {
    expect(renderAmount(-85_000).textContent).toBe(formatTzs(-85_000, "en"));
    expect(renderAmount(0).textContent).toBe(formatTzs(0, "en"));
  });

  it("refuses fractional shillings instead of rounding them", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<MoneyCell amount={450_000.5} />)).toThrow(RangeError);
  });
});
