import { lazy } from "react";
import { DEMO_MODE } from "@/lib/demo-mode";

/**
 * Demo accounts and codes panel: only when the mock backend answers (dev:mock or
 * the public demo). Lazy, so neither the panel nor the demo data reaches a real build.
 */
export const DemoHints = DEMO_MODE
  ? lazy(() => import("./DemoHints").then((module) => ({ default: module.DemoHints })))
  : null;
