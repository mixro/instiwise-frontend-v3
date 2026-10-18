import "@fontsource-variable/inter";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "@/app/App";
import { AppProviders } from "@/app/providers";
import { DEMO_MODE } from "@/lib/demo-mode";
import "@/styles/index.css";

/** The demo and dev:mock answer /api with MSW. Rendering waits until the worker is ready. */
async function enableMocking(): Promise<void> {
  if (!DEMO_MODE) return;
  const { worker } = await import("@/mocks/browser");
  await worker.start({
    // Relative to the site's base path, so the demo also works below "/".
    serviceWorker: { url: `${import.meta.env.BASE_URL}mockServiceWorker.js` },
    onUnhandledRequest: "bypass",
    // Request logs are for development; the public demo keeps the console quiet.
    quiet: !import.meta.env.DEV,
  });
}

const container = document.getElementById("root");
if (!container) throw new Error("Missing #root element");

void enableMocking().then(() => {
  createRoot(container).render(
    <StrictMode>
      <AppProviders>
        <App />
      </AppProviders>
    </StrictMode>,
  );
});
