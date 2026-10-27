import { delay, HttpResponse } from "msw";
import type { ResetCodeIssued, ResetCodeStatus } from "@/features/auth/api";
import { addAudit, MOCK_ADMIN, staffState } from "./admin-store";
import { resetAccountPassword } from "./auth";
import { refuseUnless } from "./caller";
import { newShortCode } from "./codes";
import { fail, failRateLimited, on } from "./contract";
import { codeTaken } from "./invitations";
import { MOCK_ADMIN_ID } from "./staff-seed";
import { RESET_CODE_HOURS, RESET_LOCK_AFTER, type MockResetCode } from "./reset-seed";

/*
 * Password reset codes (ADR 0005, decided 2026-10-27), enforced as the server will:
 * - only an admin issues or cancels, for a client or an operator (403 for anyone else);
 * - a code is returned once; account records only carry its times;
 * - one use, 24 hours, and a new code cancels the account's active one;
 * - checking reveals nothing about the account; each state has its own error;
 * - 5 refused completions lock a code; too many failures from this browser
 *   (RESET_CLIENT_LIMIT in RESET_CLIENT_WINDOW_MS) answer RATE_LIMITED;
 * - completing sets the password but never signs in; the code and the password
 *   are never written to the audit log.
 */

export const RESET_CLIENT_LIMIT = 10;
const RESET_CLIENT_WINDOW_MS = 15 * 60 * 1000;
const PASSWORD_RULE = /^(?=.*\p{L})(?=.*\d).{8,128}$/u;

type ResetState = "ACTIVE" | "USED" | "CANCELLED" | "LOCKED" | "EXPIRED";

function stateOf(reset: MockResetCode): ResetState {
  if (reset.cancelledAt) return "CANCELLED";
  if (reset.usedAt) return "USED";
  if (reset.failedAttempts >= RESET_LOCK_AFTER) return "LOCKED";
  if (Date.parse(reset.expiresAt) <= Date.now()) return "EXPIRED";
  return "ACTIVE";
}

const resetCodes = () => staffState().resetCodes;

/** For AdminClient.resetCode and AdminOperator.resetCode: times only, never the code. */
export function resetCodeStatus(accountId: string): ResetCodeStatus {
  const active = resetCodes().find((r) => r.accountId === accountId && stateOf(r) === "ACTIVE");
  return active
    ? { issuedAt: active.issuedAt, expiresAt: active.expiresAt, issuedBy: active.issuedBy }
    : null;
}

/** A client or an operator (never an admin) with what sign-in needs to know. */
function findAccount(accountId: string) {
  const { clients, operators } = staffState();
  const client = clients.find((c) => c.id === accountId);
  if (client) {
    return {
      name: client.name,
      email: client.email,
      role: "CLIENT" as const,
      state: "ACTIVE" as const,
    };
  }
  const operator = operators.find((o) => o.id === accountId);
  if (operator) {
    return {
      name: operator.name,
      email: operator.email,
      role: "OPERATOR" as const,
      state: operator.status,
    };
  }
  return undefined;
}

function cancel(reset: MockResetCode, accountName: string) {
  reset.cancelledAt = new Date().toISOString();
  addAudit({
    actor: MOCK_ADMIN,
    actorRole: "ADMIN",
    action: "PASSWORD_RESET_CODE_CANCELLED",
    target: accountName,
  });
}

// ----- the per-client limit -----

function recentFailures(): number[] {
  const since = Date.now() - RESET_CLIENT_WINDOW_MS;
  const failures = staffState().resetFailures.filter((time) => time > since);
  staffState().resetFailures = failures;
  return failures;
}

function rateLimited() {
  const failures = recentFailures();
  if (failures.length < RESET_CLIENT_LIMIT) return undefined;
  const oldest = failures[0] ?? Date.now();
  return failRateLimited((oldest + RESET_CLIENT_WINDOW_MS - Date.now()) / 1000);
}

/** A failed check or completion counts toward this browser's limit. */
function failed(response: ReturnType<typeof fail>) {
  staffState().resetFailures.push(Date.now());
  return response;
}

/** The code if it can be used, or the error that says why not (and nothing about whose it is). */
function usable(code: string): MockResetCode | ReturnType<typeof fail> {
  const reset = resetCodes().find((r) => r.code === code);
  if (!reset) return failed(fail(404, "RESET_CODE_NOT_FOUND"));
  switch (stateOf(reset)) {
    case "USED":
      return failed(fail(409, "RESET_CODE_ALREADY_USED"));
    case "CANCELLED":
      return failed(fail(410, "RESET_CODE_CANCELLED"));
    case "LOCKED":
      return failed(fail(410, "RESET_CODE_LOCKED"));
    case "EXPIRED":
      return failed(fail(410, "RESET_CODE_EXPIRED"));
    case "ACTIVE":
      return reset;
  }
}

export const resetCodeHandlers = [
  on.post("/admin/accounts/{accountId}/reset-code", async ({ params }) => {
    await delay();
    const refused = refuseUnless("ADMIN");
    if (refused) return refused;
    const account = findAccount(params.accountId);
    if (!account) return fail(404, "ACCOUNT_NOT_FOUND");

    for (const reset of resetCodes()) {
      if (reset.accountId === params.accountId && stateOf(reset) === "ACTIVE") {
        cancel(reset, account.name);
      }
    }
    const issuedAt = new Date();
    const reset: MockResetCode = {
      code: newShortCode(codeTaken),
      accountId: params.accountId,
      issuedAt: issuedAt.toISOString(),
      expiresAt: new Date(issuedAt.getTime() + RESET_CODE_HOURS * 60 * 60 * 1000).toISOString(),
      issuedBy: { id: MOCK_ADMIN_ID, name: MOCK_ADMIN },
      failedAttempts: 0,
    };
    resetCodes().push(reset);
    addAudit({
      actor: MOCK_ADMIN,
      actorRole: "ADMIN",
      action: "PASSWORD_RESET_CODE_ISSUED",
      target: account.name,
    });
    return HttpResponse.json<ResetCodeIssued>(
      {
        code: reset.code,
        link: new URL(`/reset/${reset.code}`, window.location.origin).toString(),
        issuedAt: reset.issuedAt,
        expiresAt: reset.expiresAt,
      },
      { status: 201 },
    );
  }),

  on.post("/admin/accounts/{accountId}/reset-code/cancellation", async ({ params }) => {
    await delay();
    const refused = refuseUnless("ADMIN");
    if (refused) return refused;
    const account = findAccount(params.accountId);
    if (!account) return fail(404, "ACCOUNT_NOT_FOUND");
    const active = resetCodes().find(
      (r) => r.accountId === params.accountId && stateOf(r) === "ACTIVE",
    );
    if (!active) return fail(409, "RESET_CODE_NOT_ACTIVE");
    cancel(active, account.name);
    return new HttpResponse(null, { status: 204 });
  }),

  on.get("/auth/reset-codes/{code}", async ({ params }) => {
    await delay();
    const limited = rateLimited();
    if (limited) return limited;
    const reset = usable(params.code);
    if (reset instanceof Response) return reset;
    return HttpResponse.json({ code: reset.code, expiresAt: reset.expiresAt });
  }),

  on.post("/auth/reset-codes/{code}/completion", async ({ params, request }) => {
    await delay();
    const limited = rateLimited();
    if (limited) return limited;
    const reset = usable(params.code);
    if (reset instanceof Response) return reset;
    const account = findAccount(reset.accountId);
    if (!account) return failed(fail(404, "RESET_CODE_NOT_FOUND"));

    const body = (await request.json().catch(() => ({}))) as { password?: unknown };
    if (typeof body.password !== "string" || !PASSWORD_RULE.test(body.password)) {
      // A refused attempt on a real code: five of them lock it.
      reset.failedAttempts += 1;
      return failed(fail(422, "VALIDATION_FAILED"));
    }
    reset.usedAt = new Date().toISOString();
    resetAccountPassword(account, body.password);
    addAudit({
      actor: account.name,
      actorRole: account.role,
      action: "PASSWORD_RESET_COMPLETED",
      target: account.name,
    });
    return new HttpResponse(null, { status: 204 });
  }),
];
