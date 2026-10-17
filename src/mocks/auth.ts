import { delay, http, HttpResponse } from "msw";
import type {
  AuthUser,
  Invitation,
  RegistrationBody,
  RegistrationResult,
} from "@/features/auth/api";
import {
  DEMO_ACCOUNTS,
  DEMO_CODES,
  DEMO_INVITER,
  DEMO_PASSWORD,
  type DemoAccount,
} from "./demo-data";
import { staffState } from "./admin-store";

/*
 * Fake auth API. Keeps registrations in memory (lost on reload), so a new account
 * can sign in straight away. Error bodies follow the contract's ErrorResponse.
 */

interface StoredAccount extends DemoAccount {
  id: string;
  password: string;
}

let accounts: StoredAccount[] = [];
let usedCodes = new Set<string>();

/** Back to the demo data. Tests call this between cases. */
/** Admin decisions about an operator reach sign-in (approved, suspended, rejected). */
export function setMockAccountState(email: string, state: DemoAccount["state"]): void {
  const account = findAccount(email);
  if (account) account.state = state;
}

export function resetMockAuth(): void {
  accounts = DEMO_ACCOUNTS.map((account, index) => ({
    ...account,
    id: `usr_demo_${index + 1}`,
    password: DEMO_PASSWORD,
  }));
  usedCodes = new Set();
}

resetMockAuth();

function error(status: number, code: string, message: string) {
  return HttpResponse.json({ error: { code, message } }, { status });
}

function toUser({ id, name, email, role }: StoredAccount): AuthUser {
  return { id, name, email, role };
}

function findAccount(email: string): StoredAccount | undefined {
  const wanted = email.trim().toLowerCase();
  return accounts.find((account) => account.email === wanted);
}

/** Looks a code up; returns the invitation or an error response. */
function resolveInvitation(code: string): Invitation | Response {
  const outcome = DEMO_CODES[code];
  if (!outcome) return error(404, "INVITATION_NOT_FOUND", "No invitation with this code");
  if (outcome === "INVITATION_EXPIRED") return error(410, outcome, "Invitation expired");
  if (outcome === "INVITATION_REVOKED") return error(410, outcome, "Invitation revoked");
  if (outcome === "INVITATION_ALREADY_USED" || usedCodes.has(code)) {
    return error(409, "INVITATION_ALREADY_USED", "Invitation already used");
  }
  const days = staffState().settings.invitationValidityDays;
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
  return { code, role: outcome, inviterName: DEMO_INVITER, expiresAt };
}

export const authHandlers = [
  http.post("/api/auth/login", async ({ request }) => {
    await delay();
    const { email, password } = (await request.json()) as { email: string; password: string };
    const account = findAccount(email);

    if (account?.state === "RATE_LIMITED") {
      return error(429, "RATE_LIMITED", "Too many attempts");
    }
    if (!account || account.password !== password) {
      return error(401, "INVALID_CREDENTIALS", "Wrong email or password");
    }
    if (account.state === "PENDING_APPROVAL") {
      return error(403, "ACCOUNT_PENDING_APPROVAL", "Operator not approved yet");
    }
    if (account.state === "REJECTED") {
      return error(403, "ACCOUNT_REJECTED", "Operator not approved");
    }
    if (account.state === "SUSPENDED") {
      return error(403, "ACCOUNT_SUSPENDED", "Account suspended");
    }
    return HttpResponse.json({ user: toUser(account) });
  }),

  http.get("/api/invitations/:code", async ({ params }) => {
    await delay();
    const result = resolveInvitation(String(params.code));
    return result instanceof Response ? result : HttpResponse.json(result);
  }),

  http.post("/api/invitations/:code/registrations", async ({ params, request }) => {
    await delay();
    const code = String(params.code);
    const invitation = resolveInvitation(code);
    if (invitation instanceof Response) return invitation;

    const body = (await request.json()) as RegistrationBody;
    if (findAccount(body.email)) {
      return error(409, "EMAIL_TAKEN", "An account with this email exists");
    }

    const account: StoredAccount = {
      id: `usr_${accounts.length + 1}`,
      email: body.email.trim().toLowerCase(),
      name: body.name.trim(),
      role: invitation.role,
      state: invitation.role === "OPERATOR" ? "PENDING_APPROVAL" : "ACTIVE",
      password: body.password,
    };
    accounts.push(account);
    // Admin screens see the new person: an operator waiting for approval, or a
    // client not yet assigned to an operator.
    if (account.role === "OPERATOR") {
      staffState().operators.push({
        id: `op_${account.id}`,
        name: account.name,
        email: account.email,
        phone: body.phone ?? "",
        status: "PENDING_APPROVAL",
        registeredAt: new Date().toISOString(),
      });
    } else {
      staffState().clients.push({
        id: `cli_${account.id}`,
        name: account.name,
        email: account.email,
        phone: body.phone,
        operatorId: null,
      });
    }
    usedCodes.add(code);

    const result: RegistrationResult =
      account.state === "ACTIVE"
        ? { status: "ACTIVE", user: toUser(account) }
        : { status: "PENDING_APPROVAL" };
    return HttpResponse.json(result, { status: 201 });
  }),
];
