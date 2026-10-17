import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AppProviders } from "@/app/providers";
import { StarterPage } from "./StarterPage";

function stubHealth(ok: boolean) {
  const fetchMock = vi.fn().mockResolvedValue(
    ok
      ? new Response(
          JSON.stringify({ status: "ok", version: "9.9.9", time: "2026-10-17T00:00:00Z" }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        )
      : new Response(JSON.stringify({ error: { code: "SERVER_ERROR", message: "boom" } }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function renderPage() {
  return render(
    <AppProviders>
      <StarterPage />
    </AppProviders>,
  );
}

describe("StarterPage", () => {
  it("shows the logo, the title and a connected API", async () => {
    stubHealth(true);
    renderPage();

    expect(screen.getByRole("img", { name: "INSTIWISE" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Your projects, agreements and payments in one place",
    );
    expect(await screen.findByText(/API connected, version 9\.9\.9/)).toBeInTheDocument();
  });

  it("tells the developer when the API is not running", async () => {
    stubHealth(false);
    renderPage();
    expect(await screen.findByText(/API not reachable/)).toBeInTheDocument();
  });

  it("switches the whole screen to Swahili", async () => {
    stubHealth(true);
    renderPage();

    await userEvent.click(screen.getByRole("button", { name: "Kiswahili" }));

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Miradi, makubaliano na malipo yako mahali pamoja",
    );
    expect(document.documentElement.lang).toBe("sw");
  });

  it("formats the sample balance as Tanzanian shillings", async () => {
    stubHealth(true);
    renderPage();
    // 1,200,000 agreed minus 750,000 paid
    expect(await screen.findByText(/450[,.\s  ]?000/)).toBeInTheDocument();
  });
});
