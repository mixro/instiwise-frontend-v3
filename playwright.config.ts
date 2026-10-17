import { defineConfig, devices } from "@playwright/test";

// Its own port, so a `npm run dev` you already have open on 5173 is left alone.
const PORT = 5174;
const isCI = Boolean(process.env.CI);
// Optional: run in an installed browser instead of the downloaded one,
// e.g. PW_CHANNEL=chrome or PW_CHANNEL=msedge. CI always uses Playwright's Chromium.
const channel = isCI ? undefined : process.env.PW_CHANNEL;

/**
 * Smoke suite: every layout and /dev/components, in light and dark, English and
 * Swahili, at phone and desktop widths. Saves screenshots to e2e/screenshots/ and
 * fails on serious or critical axe violations.
 *
 * Runs against the Vite dev server with the MSW mock backend, because the mock
 * role switcher, /dev/components and the mock API only exist in development.
 */
export default defineConfig({
  testDir: "e2e",
  // Cold dev-server compiles plus axe on long pages (the component gallery) need more than 30 s.
  timeout: 60_000,
  outputDir: "test-results",
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  workers: isCI ? 2 : undefined,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    ...(channel ? { channel } : {}),
  },
  projects: [
    { name: "phone", use: { ...devices["Pixel 7"] } },
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } },
    },
  ],
  webServer: {
    command: `npm run dev -- --port ${PORT} --strictPort`,
    env: { VITE_USE_MOCKS: "true" },
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !isCI,
    timeout: 120_000,
  },
});
