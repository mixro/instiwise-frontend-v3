import { HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import type { ProjectDetail } from "@/features/client/api";
import { apiClient } from "@/lib/api";
import { fail, on } from "@/mocks/contract";
import { toColonPath } from "./types";

/*
 * The lines below are checked by `tsc` (npm run typecheck), never run. Each
 * @ts-expect-error must still be an error: if the typing were loosened so that a
 * call or a mock off the contract compiled again, the type check would fail.
 */
function contractChecks() {
  // Results come from the contract.
  const detail: Promise<ProjectDetail> = apiClient.GET("/client/projects/{projectId}", {
    path: { projectId: "prj_1" },
  });

  // @ts-expect-error a path the contract does not have
  void apiClient.GET("/client/nothing-here");
  // @ts-expect-error path parameters are required
  void apiClient.GET("/client/projects/{projectId}");
  // @ts-expect-error a body field the contract does not have
  void apiClient.POST("/auth/login", { body: { email: "a@example.com", pass: "x" } });
  // @ts-expect-error a query value outside the contract's enum
  void apiClient.GET("/admin/change-requests", { query: { status: "PENDING" } });

  return [
    detail,
    // @ts-expect-error a mock answering with a shape the contract does not list
    on.get("/client/home", () => HttpResponse.json({ totals: 0 })),
    on.get("/client/projects/{projectId}", ({ params }) => {
      // @ts-expect-error only the contract's path parameter names exist
      void params.id;
      return fail(404, "PROJECT_NOT_FOUND");
    }),
    // @ts-expect-error an error code the contract does not define
    fail(404, "NOT_A_CONTRACT_CODE"),
  ];
}

describe("contract typing", () => {
  it("keeps the compile-time checks above in the type check", () => {
    expect(typeof contractChecks).toBe("function");
  });

  it("turns contract paths into MSW paths", () => {
    expect(
      toColonPath("/client/projects/{projectId}/agreement/versions/{version}/acceptance"),
    ).toBe("/client/projects/:projectId/agreement/versions/:version/acceptance");
  });
});
