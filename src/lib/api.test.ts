import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { server } from "@/test/server";
import { api, ApiError } from "./api";

async function failure(): Promise<ApiError> {
  try {
    await api("/probe");
  } catch (error) {
    if (error instanceof ApiError) return error;
    throw error;
  }
  throw new Error("expected the call to fail");
}

describe("api errors", () => {
  it("keeps the backend's own error code", async () => {
    server.use(
      http.get("/api/probe", () =>
        HttpResponse.json({ error: { code: "RATE_LIMITED", message: "x" } }, { status: 429 }),
      ),
    );
    expect(await failure()).toMatchObject({ code: "RATE_LIMITED", status: 429 });
  });

  it("reads a bare 5xx from a proxy as an unreachable server", async () => {
    // What the Vite dev proxy sends when the backend is not running (and what nginx
    // sends as 502/504): no JSON error body.
    server.use(
      http.get(
        "/api/probe",
        () => new HttpResponse(null, { status: 500, headers: { "Content-Type": "text/plain" } }),
      ),
    );
    expect(await failure()).toMatchObject({ code: "SERVER_UNREACHABLE", status: 500 });

    server.use(
      http.get(
        "/api/probe",
        () =>
          new HttpResponse("<html>Bad Gateway</html>", {
            status: 502,
            headers: { "Content-Type": "text/html" },
          }),
      ),
    );
    expect(await failure()).toMatchObject({ code: "SERVER_UNREACHABLE", status: 502 });
  });

  it("keeps a JSON 500 from the backend as its own code", async () => {
    server.use(
      http.get("/api/probe", () =>
        HttpResponse.json({ error: { code: "INTERNAL_ERROR", message: "x" } }, { status: 500 }),
      ),
    );
    expect(await failure()).toMatchObject({ code: "INTERNAL_ERROR" });
  });

  it("reports a request that never reached anything", async () => {
    server.use(http.get("/api/probe", () => HttpResponse.error()));
    expect(await failure()).toMatchObject({ code: "NETWORK_ERROR", status: 0 });
  });
});
