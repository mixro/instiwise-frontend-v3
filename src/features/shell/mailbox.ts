import { lazy } from "react";
import { DEMO_MODE } from "@/lib/demo-mode";

/**
 * The demo Mailbox (ADR 0006): only when the mock backend answers. Lazy, so
 * neither the panel nor the mock emails reach a real build.
 */
export const MailboxButton = DEMO_MODE
  ? lazy(() => import("./MailboxButton").then((module) => ({ default: module.MailboxButton })))
  : null;
