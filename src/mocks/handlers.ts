import { http, HttpResponse } from "msw";
import type { Health } from "@/lib/api";
import { adminHandlers } from "./admin";
import { authHandlers } from "./auth";
import { changeHandlers } from "./changes";
import { clientHandlers } from "./client";
import { operatorHandlers } from "./operator";

/**
 * Fake API used while the backend does not exist yet (VITE_USE_MOCKS=true).
 * Keep these in step with contracts/openapi.yaml. Use realistic data:
 * Tanzanian names, TZS amounts, real project titles.
 */
export const handlers = [
  http.get("/api/health", () => {
    const body: Health = { status: "ok", version: "mock", time: new Date().toISOString() };
    return HttpResponse.json(body);
  }),
  ...authHandlers,
  ...clientHandlers,
  ...changeHandlers,
  ...operatorHandlers,
  ...adminHandlers,
];
