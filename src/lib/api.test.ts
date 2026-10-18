import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { server } from "@/test/server";
import { apiClient, ApiError } from "./api";

async function failure(): Promise<ApiError> {
  try {
    await apiClient.GET("/health");
  } catch (error) {
    if (error instanceof ApiError) return error;
    throw error;
  }
  throw new Error("expected the call to fail");
}

describe("api errors", () => {
  it("keeps the backend's own error code", async () => {
    server.use(
      http.get("/api/health", () =>
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
        "/api/health",
        () => new HttpResponse(null, { status: 500, headers: { "Content-Type": "text/plain" } }),
      ),
    );
    expect(await failure()).toMatchObject({ code: "SERVER_UNREACHABLE", status: 500 });

    server.use(
      http.get(
        "/api/health",
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
      http.get("/api/health", () =>
        HttpResponse.json({ error: { code: "INTERNAL_ERROR", message: "x" } }, { status: 500 }),
      ),
    );
    expect(await failure()).toMatchObject({ code: "INTERNAL_ERROR" });
  });

  it("reports a request that never reached anything", async () => {
    server.use(http.get("/api/health", () => HttpResponse.error()));
    expect(await failure()).toMatchObject({ code: "NETWORK_ERROR", status: 0 });
  });
});

describe("typed client", () => {
  it("fills path parameters, encodes them, and drops empty query values", async () => {
    let seen = "";
    server.use(
      http.get("/api/client/receipts/:receiptNumber", ({ request }) => {
        seen = request.url;
        return HttpResponse.json(
          { error: { code: "RECEIPT_NOT_FOUND", message: "x" } },
          { status: 404 },
        );
      }),
      http.get("/api/admin/audit", ({ request }) => {
        seen = request.url;
        return HttpResponse.json({ entries: [], actors: [], nextCursor: null });
      }),
    );

    await expect(
      apiClient.GET("/client/receipts/{receiptNumber}", { path: { receiptNumber: "RC 1/2" } }),
    ).rejects.toMatchObject({ code: "RECEIPT_NOT_FOUND", status: 404 });
    expect(seen).toMatch(/\/api\/client\/receipts\/RC%201%2F2$/);

    await apiClient.GET("/admin/audit", { query: { actor: "Asha", action: undefined, from: "" } });
    expect(new URL(seen).search).toBe("?actor=Asha");
  });

  it("sends JSON bodies and resolves 204 and 202 answers to undefined", async () => {
    let sent: unknown;
    server.use(
      http.post("/api/auth/password-reset", async ({ request }) => {
        sent = await request.json();
        return new HttpResponse(null, { status: 202 });
      }),
      http.post("/api/auth/logout", () => new HttpResponse(null, { status: 204 })),
    );

    await expect(
      apiClient.POST("/auth/password-reset", { body: { email: "asha@example.co.tz" } }),
    ).resolves.toBeUndefined();
    expect(sent).toEqual({ email: "asha@example.co.tz" });
    await expect(apiClient.POST("/auth/logout")).resolves.toBeUndefined();
  });
});
