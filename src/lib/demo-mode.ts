/**
 * The public demo: the build was made with VITE_USE_MOCKS=true, so the MSW mock
 * API answers every /api call (`npm run dev:mock`, or a Netlify demo deploy).
 * Vite inlines the value at build time, so in a real build every branch guarded
 * by it, and the demo code and data it imports lazily, are left out of the bundle.
 */
export const DEMO_MODE = import.meta.env.VITE_USE_MOCKS === "true";

/**
 * Demo conveniences that development also keeps without mocks: the session is
 * remembered across reloads, and the toolbar can switch to a mock role.
 * Off in real production builds.
 */
export const DEMO_TOOLS = import.meta.env.DEV || DEMO_MODE;
