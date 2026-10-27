import { lazy } from "react";
import { DEMO_MODE } from "@/lib/demo-mode";

/** Demo mode only: where the "sent" email is (the Mailbox). Absent from real builds. */
export const MailboxHint = DEMO_MODE
  ? lazy(() => import("./MailboxHint").then((module) => ({ default: module.MailboxHint })))
  : null;
