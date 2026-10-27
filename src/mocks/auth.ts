import { delay, HttpResponse } from "msw";
import type { AuthUser, Invitation, RegistrationResult, Session } from "@/features/auth/api";
import type { Language } from "@/i18n/languages";
import {
  DEMO_ACCOUNTS,
  DEMO_CODES,
  DEMO_INVITER,
  DEMO_PASSWORD,
  type DemoAccount,
} from "./demo-data";
import { addAudit, staffState } from "./admin-store";
import { callerSession } from "./caller";
import { fail, on } from "./contract";
import { emailStatus, sendVerification } from "./email";
import { acceptStaffInvitation, resolveStaffInvitation } from "./invitations";
import { renameMockClientEmail } from "./client";
import { NO_PERMISSIONS } from "./staff-seed";

/*
 * Fake auth API. Keeps registrations in memory (lost on reload), so a new account
 * can sign in straight away. Error bodies follow the contract's ErrorResponse.
 */

export interface StoredAccount extends DemoAccount {
  id: string;
  password: string;
  /** Saved with the account (decided 2026-10-21): sign-in switches to it. */
  preferredLanguage: Language;
}

let accounts: StoredAccount[] = [];
let usedCodes = new Set<string>();
/**
 * The mocks do not check tokens yet (phase 4), so "the signed-in user" for
 * POST /auth/password is whoever signed in last in this tab, or the demo
 * operator when the role switcher was used instead of the sign-in form.
 */
let lastSignedIn: string | null = null;
/**
 * Accounts whose sessions a password reset ended (ADR 0006). The mock has no
 * refresh tokens, so /auth/me answers 401 for a stored session of these until
 * the person signs in again.
 */
let revoked = new Set<string>();
const DEMO_OPERATOR_EMAIL = "baraka@example.com";

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
    preferredLanguage: "en" as Language,
  }));
  usedCodes = new Set();
  lastSignedIn = null;
  revoked = new Set();
}

/** The account's saved language (the client and operator profiles read and write it here). */
export function accountLanguage(email: string): Language {
  return findAccount(email)?.preferredLanguage ?? "en";
}

export function setAccountLanguage(email: string, language: Language): void {
  const account = findAccount(email);
  if (account) account.preferredLanguage = language;
}

/**
 * A completed password reset (ADR 0005). Accounts of the staff seed that never
 * signed in here get one, with the state the admin screens show, so sign-in
 * still refuses a suspended, waiting or rejected operator afterwards. The real
 * server also revokes every refresh token; here the remembered sign-in ends.
 */
export function resetAccountPassword(
  person: Pick<DemoAccount, "email" | "name" | "role" | "state">,
  password: string,
): void {
  const account = findAccount(person.email);
  if (account) {
    account.password = password;
  } else {
    accounts.push({
      ...person,
      id: `usr_${accounts.length + 1}`,
      password,
      preferredLanguage: "en",
    });
  }
  revokeSessions(person.email);
}

/** The account behind an email (the email mocks look people up this way). */
export const mockAccount = (email: string): StoredAccount | undefined => findAccount(email);

/** Sets a new password (a reset by email). */
export function setAccountPassword(email: string, password: string): void {
  const account = findAccount(email);
  if (account) account.password = password;
}

/** Every session of the account ends (a completed reset). */
export function revokeSessions(email: string): void {
  const wanted = email.trim().toLowerCase();
  revoked.add(wanted);
  if (lastSignedIn === wanted) lastSignedIn = null;
}

/** Whether any account, or any client or operator record, already uses this address. */
export function emailInUse(email: string): boolean {
  const wanted = email.trim().toLowerCase();
  const { clients, operators } = staffState();
  return (
    findAccount(wanted) !== undefined ||
    clients.some((client) => client.email === wanted) ||
    operators.some((operator) => operator.email === wanted)
  );
}

/** A confirmed email change: the new address signs in, everywhere the old one was used. */
export function changeAccountEmail(from: string, to: string): void {
  const account = findAccount(from);
  if (account) account.email = to;
  const { clients, operators } = staffState();
  for (const client of clients) if (client.email === from) client.email = to;
  for (const operator of operators) if (operator.email === from) operator.email = to;
  renameMockClientEmail(from, to);
  if (lastSignedIn === from) lastSignedIn = to;
}

/** The demo people behind a bare role (role switcher, tests): Neema, Baraka, Rehema. */
const ROLE_ACCOUNT_IDS = { CLIENT: "usr_demo_1", OPERATOR: "usr_demo_2", ADMIN: "usr_demo_3" };

/**
 * Who the mock thinks is signed in: the account the sign-in form stored, the
 * demo person for a bare role, or else whoever signed in last in this tab.
 * Undefined when nobody is, or when a reset ended that session.
 */
export function currentAccount(): StoredAccount | undefined {
  const session = callerSession();
  // No stored session (a real build keeps none): whoever signed in last in this tab.
  if (!session) return lastSignedIn ? findAccount(lastSignedIn) : undefined;
  const account = session.email
    ? findAccount(session.email)
    : accounts.find((candidate) => candidate.id === ROLE_ACCOUNT_IDS[session.role]);
  if (!account || (session.email && revoked.has(account.email))) return undefined;
  return account;
}

/** Whether these credentials would sign in (tests use it to prove a reset worked). */
export function mockPasswordMatches(email: string, password: string): boolean {
  return findAccount(email)?.password === password;
}

/** A profile name change also shows at the next sign-in. */
export function renameAccount(email: string, name: string): void {
  const account = findAccount(email);
  if (account) account.name = name;
}

resetMockAuth();

/** Operators carry the permissions an admin granted them (contract AuthUser). */
function toUser({ id, name, email, role, preferredLanguage }: StoredAccount): AuthUser {
  const user = { id, name, email, role, preferredLanguage, ...emailStatus(email) };
  if (role !== "OPERATOR") return user;
  const operator = staffState().operators.find((o) => o.email === email);
  return { ...user, permissions: operator?.permissions ?? NO_PERMISSIONS };
}

const PASSWORD_RULE = /^(?=.*[A-Za-z])(?=.*\d).{8,128}$/;

const ACCESS_TOKEN_MS = 15 * 60 * 1000;

/** The mocks do not check tokens; the shape is the contract's. */
function sessionFor(account: StoredAccount): Session {
  return {
    user: toUser(account),
    accessToken: `mock-token-${account.id}`,
    accessTokenExpiresAt: new Date(Date.now() + ACCESS_TOKEN_MS).toISOString(),
  };
}

function findAccount(email: string): StoredAccount | undefined {
  const wanted = email.trim().toLowerCase();
  return accounts.find((account) => account.email === wanted);
}

/** Looks a code up; returns the invitation or an error response. */
function resolveInvitation(code: string): Invitation | ReturnType<typeof fail> {
  // Invitations created by staff on the invitation screens (and their seed).
  const staff = resolveStaffInvitation(code);
  if (staff) return staff;
  const outcome = DEMO_CODES[code];
  if (!outcome) return fail(404, "INVITATION_NOT_FOUND");
  if (outcome === "INVITATION_EXPIRED") return fail(410, outcome);
  if (outcome === "INVITATION_REVOKED") return fail(410, outcome);
  if (outcome === "INVITATION_ALREADY_USED" || usedCodes.has(code)) {
    return fail(409, "INVITATION_ALREADY_USED");
  }
  const days = staffState().settings.invitationValidityDays;
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
  return { code, role: outcome, inviterName: DEMO_INVITER, expiresAt };
}

export const authHandlers = [
  on.post("/auth/login", async ({ request }) => {
    await delay();
    const { email, password } = await request.json();
    const account = findAccount(email);

    if (account?.state === "RATE_LIMITED") return fail(429, "RATE_LIMITED");
    if (!account || account.password !== password) return fail(401, "INVALID_CREDENTIALS");
    if (account.state === "PENDING_APPROVAL") return fail(403, "ACCOUNT_PENDING_APPROVAL");
    if (account.state === "REJECTED") return fail(403, "ACCOUNT_REJECTED");
    if (account.state === "SUSPENDED") return fail(403, "ACCOUNT_SUSPENDED");
    lastSignedIn = account.email;
    revoked.delete(account.email);
    return HttpResponse.json(sessionFor(account));
  }),

  on.get("/auth/me", async () => {
    await delay();
    const account = currentAccount();
    return account ? HttpResponse.json(toUser(account)) : fail(401, "UNAUTHENTICATED");
  }),

  on.post("/auth/password", async ({ request }) => {
    await delay();
    const account = findAccount(lastSignedIn ?? DEMO_OPERATOR_EMAIL);
    if (!account) return fail(401, "UNAUTHENTICATED");
    const { currentPassword, newPassword } = await request.json();
    if (currentPassword !== account.password) return fail(422, "CURRENT_PASSWORD_WRONG");
    if (!PASSWORD_RULE.test(newPassword) || newPassword === currentPassword) {
      return fail(422, "VALIDATION_FAILED");
    }
    account.password = newPassword;
    // The real server also revokes every other refresh token of the account.
    addAudit({
      actor: account.name,
      actorRole: account.role,
      action: "PASSWORD_CHANGED",
      target: account.name,
    });
    return new HttpResponse(null, { status: 204 });
  }),

  on.get("/invitations/{code}", async ({ params }) => {
    await delay();
    const result = resolveInvitation(params.code);
    return result instanceof Response ? result : HttpResponse.json(result);
  }),

  on.post("/invitations/{code}/registrations", async ({ params, request }) => {
    await delay();
    const code = params.code;
    const invitation = resolveInvitation(code);
    if (invitation instanceof Response) return invitation;

    const body = await request.json();
    if (findAccount(body.email)) return fail(409, "EMAIL_TAKEN");

    const account: StoredAccount = {
      id: `usr_${accounts.length + 1}`,
      email: body.email.trim().toLowerCase(),
      name: body.name.trim(),
      role: invitation.role,
      state: invitation.role === "OPERATOR" ? "PENDING_APPROVAL" : "ACTIVE",
      password: body.password,
      // The interface language at registration (ADR 0006): the verification email uses it.
      preferredLanguage: body.preferredLanguage ?? "en",
    };
    accounts.push(account);
    if (account.state === "ACTIVE") lastSignedIn = account.email;
    // A staff invitation is used once; a client invited by an operator (or for one)
    // is assigned to that operator straight away.
    const assignedTo = acceptStaffInvitation(code, account.name, account.email);
    // Admin screens see the new person: an operator waiting for approval, or a
    // client, assigned or not yet.
    if (account.role === "OPERATOR") {
      staffState().operators.push({
        id: `op_${account.id}`,
        name: account.name,
        email: account.email,
        phone: body.phone ?? "",
        status: "PENDING_APPROVAL",
        registeredAt: new Date().toISOString(),
        permissions: NO_PERMISSIONS,
      });
    } else {
      staffState().clients.push({
        id: `cli_${account.id}`,
        name: account.name,
        email: account.email,
        phone: body.phone,
        operatorId: assignedTo?.id ?? null,
      });
      if (assignedTo) {
        addAudit({
          actor: account.name,
          actorRole: "CLIENT",
          action: "CLIENT_ASSIGNED",
          target: account.name,
          to: assignedTo.name,
        });
      }
    }
    usedCodes.add(code);
    // Unverified until the link in this email is confirmed; signing in still works.
    sendVerification(account);

    const result: RegistrationResult =
      account.state === "ACTIVE"
        ? { status: "ACTIVE", ...sessionFor(account) }
        : { status: "PENDING_APPROVAL" };
    return HttpResponse.json(result, { status: 201 });
  }),
];
