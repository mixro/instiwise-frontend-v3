import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AppRoutes } from "@/app/AppRoutes";
import { AppProviders } from "@/app/providers";
import { MOCK_ROLE_STORAGE_KEY } from "@/lib/session-context";
import { DEMO_PASSWORD } from "@/mocks/demo-data";

/*
 * The public demo (VITE_USE_MOCKS=true) against a real build (flag off, not in
 * development). Vite fixes these flags at build time; here they are switched per
 * test. The mock API answers in both cases, as everywhere in the unit tests.
 */
const flags = vi.hoisted(() => ({ demo: true, tools: true }));

vi.mock("@/lib/demo-mode", () => ({
  get DEMO_MODE() {
    return flags.demo;
  },
  get DEMO_TOOLS() {
    return flags.tools;
  },
}));

afterEach(() => {
  flags.demo = true;
  flags.tools = true;
});

/** A fresh page load at `path`: whatever the browser stored is all that survives. */
function load(path: string) {
  return render(
    <AppProviders>
      <MemoryRouter initialEntries={[path]}>
        <AppRoutes />
      </MemoryRouter>
    </AppProviders>,
  );
}

async function signInAsNeema() {
  await screen.findByRole("heading", { level: 1, name: "Sign in" });
  await userEvent.type(screen.getByLabelText("Email address"), "neema@example.com");
  await userEvent.type(screen.getByLabelText("Password"), DEMO_PASSWORD);
  await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
  await screen.findByRole("region", { name: "Your balance" });
}

const banner = () => screen.queryByRole("note");

describe("demo mode on", () => {
  it("shows the demo banner on the sign-in page and inside the app", async () => {
    const first = load("/login");
    expect(await screen.findByRole("note")).toHaveTextContent(
      "Demo data. Everything here is fictional and resets when you refresh the page.",
    );
    await signInAsNeema();
    expect(banner()).toBeInTheDocument();
    first.unmount();
  });

  it("keeps the session after a reload, and offers the role switcher", async () => {
    const first = load("/login");
    await signInAsNeema();
    first.unmount();

    load("/client");
    expect(await screen.findByRole("region", { name: "Your balance" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: /^Mock role/ })).toBeInTheDocument();
  });

  it("translates the banner", async () => {
    load("/login");
    await screen.findByRole("heading", { level: 1, name: "Sign in" });
    await userEvent.click(screen.getAllByRole("button", { name: /Kiswahili/ })[0] as HTMLElement);
    expect(banner()).toHaveTextContent("Data ya maonyesho.");
  });
});

describe("demo mode off (a real build)", () => {
  it("shows no banner, stores no session, and signs out on reload", async () => {
    flags.demo = false;
    flags.tools = false;

    const first = load("/login");
    await signInAsNeema();
    expect(banner()).not.toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: /^Mock role/ })).not.toBeInTheDocument();
    expect(localStorage.getItem(MOCK_ROLE_STORAGE_KEY)).toBeNull();
    first.unmount();

    load("/client");
    expect(await screen.findByRole("heading", { level: 1, name: "Sign in" })).toBeInTheDocument();
  });
});
