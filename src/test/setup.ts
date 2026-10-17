import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, beforeEach, vi } from "vitest";
import i18n from "@/i18n";
import { resetMockStaff } from "@/mocks/admin-store";
import { resetMockAuth } from "@/mocks/auth";
import { resetMockClient } from "@/mocks/client";
import { mediaState } from "./media";
import { server } from "./server";

// The MSW handlers answer /api calls, as in the browser with VITE_USE_MOCKS=true.
// Tests that stub fetch themselves bypass them.
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterAll(() => server.close());

// Radix measures elements and captures the pointer; jsdom implements neither.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver;
Element.prototype.hasPointerCapture ??= () => false;
Element.prototype.releasePointerCapture ??= () => {};
Element.prototype.scrollIntoView ??= () => {};
// jsdom has no object URLs; the mock download handler creates one.
URL.createObjectURL ??= () => "blob:mock";

// jsdom does not implement matchMedia, so provide one that follows mediaState.
beforeEach(() => {
  mediaState.matchesDark = false;
  localStorage.clear();
  document.documentElement.classList.remove("dark");

  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: (query: string) => ({
      matches: query.includes("prefers-color-scheme: dark") ? mediaState.matchesDark : false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }),
  });
});

afterEach(async () => {
  cleanup();
  server.resetHandlers();
  resetMockAuth();
  resetMockClient();
  resetMockStaff();
  vi.unstubAllGlobals();
  await i18n.changeLanguage("en");
});
