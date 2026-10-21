import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// The dev server forwards /api to the backend, so the browser sees one origin
// and there is nothing to configure for CORS during development.
const apiTarget = process.env.VITE_API_PROXY_TARGET ?? "http://localhost:3000";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { "@": path.resolve(import.meta.dirname, "src") },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": { target: apiTarget, changeOrigin: true },
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    // The same in every checkout: a local .env must not switch the tests into demo
    // mode. Demo mode has its own tests (DemoMode.test.tsx), which set it themselves.
    env: { VITE_USE_MOCKS: "false" },
    include: ["src/**/*.test.{ts,tsx}"],
    css: false,
  },
});
