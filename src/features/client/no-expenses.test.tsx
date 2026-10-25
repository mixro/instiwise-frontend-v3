import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderApp } from "@/test/render-app";

/*
 * Clients never see expenses, costs, profit or margins (decided 2026-10-25).
 * The client's project and payment screens are rendered with the mock backend
 * (which holds expenses for these very projects) and their text is searched.
 */

const FORBIDDEN = /expense|cost|profit|margin/i;

describe("client screens show no expense, cost, profit or margin", () => {
  it.each([
    ["/client/projects/prj_irrigation/overview", "Smart irrigation controller for Kibaha farm"],
    ["/client/projects/prj_irrigation/payments", "Smart irrigation controller for Kibaha farm"],
    ["/client/projects/prj_solar/payments", "Final year report: solar water pump"],
    ["/client/payments", "Payments and receipts"],
    ["/client", "Home"],
  ])("%s", async (path, heading) => {
    renderApp(path, "CLIENT");
    await screen.findByRole("heading", { level: 1, name: heading });
    // Wait until the data is on screen, not only the loading placeholders.
    await screen.findAllByText(/TSh/);
    expect(document.body.textContent).not.toMatch(FORBIDDEN);
  });
});
