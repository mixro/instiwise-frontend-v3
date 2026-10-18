import { HttpResponse } from "msw";
import { adminHandlers } from "./admin";
import { authHandlers } from "./auth";
import { changeHandlers } from "./changes";
import { clientHandlers } from "./client";
import { on } from "./contract";
import { operatorHandlers } from "./operator";

/**
 * Fake API used while the backend does not exist yet (VITE_USE_MOCKS=true).
 * Typed against contracts/openapi.yaml (see ./contract.ts). Use realistic data:
 * Tanzanian names, TZS amounts, real project titles.
 */
export const handlers = [
  on.get("/health", () =>
    HttpResponse.json({ status: "ok", version: "mock", time: new Date().toISOString() }),
  ),
  ...authHandlers,
  ...clientHandlers,
  ...changeHandlers,
  ...operatorHandlers,
  ...adminHandlers,
];
