import { lazy } from "react";

/**
 * Demo accounts and codes panel: development builds running the mock backend
 * only. Lazy, so neither the panel nor the demo data reaches production.
 */
export const DemoHints =
  import.meta.env.DEV && import.meta.env.VITE_USE_MOCKS === "true"
    ? lazy(() => import("./DemoHints").then((module) => ({ default: module.DemoHints })))
    : null;
