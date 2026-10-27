import { delay, HttpResponse } from "msw";
import type { Language } from "@/i18n/languages";
import { addAudit } from "./admin-store";
import {
  changeAccountEmail,
  currentAccount,
  emailInUse,
  mockAccount,
  revokeSessions,
  setAccountPassword,
  type StoredAccount,
} from "./auth";
import { fail, failRateLimited, on } from "./contract";
import { DEMO_EMAIL_TOKENS, DEMO_PENDING_EMAILS, DEMO_UNVERIFIED_EMAILS } from "./demo-data";
import { deliver, resetMailbox, type MockMail } from "./mailbox";

/*
 * Email verification and password reset by email (ADR 0006, decided 2026-10-27),
 * enforced as the server will:
 * - verification links last 24 hours, reset links 1 hour; each works once, and a
 *   new one cancels the account's previous one of the same kind;
 * - at most one email per 60 seconds and 5 per hour per address, counted by the
 *   address asked for, so the answer never depends on whether an account exists;
 * - the reset request and the signed-out resend always answer 202; an email only
 *   goes to a verified address of an account that can sign in;
 * - confirming is a POST (the Confirm button), never opening the link;
 * - a new address is pending until confirmed; the old one signs in until then;
 * - completing a reset changes the password and ends every session;
 * - tokens and passwords never reach the audit log.
 * Nothing is really sent: the Mailbox panel lists what would have been.
 */

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
export const VERIFY_LINK_MS = 24 * HOUR;
export const RESET_LINK_MS = HOUR;
export const SEND_COOLDOWN_MS = MINUTE;
export const SENDS_PER_HOUR = 5;
/** Checks and completions of unknown or dead links per browser, per 15 minutes. */
export const LINK_FAILURES_LIMIT = 10;
const LINK_FAILURES_WINDOW_MS = 15 * MINUTE;
const PASSWORD_RULE = /^(?=.*\p{L})(?=.*\d).{8,128}$/u;

interface MockToken {
  token: string;
  kind: "VERIFY" | "CHANGE" | "RESET";
  /** The account's sign-in address when the link was made (moves with a change). */
  account: string;
  /** Where the link went: the sign-in address, or the new one for a change. */
  address: string;
  expiresAt: number;
  usedAt?: number;
  cancelledAt?: number;
}

interface EmailState {
  tokens: MockToken[];
  unverified: Set<string>;
  pending: Map<string, string>;
  /** Sends per address (lower case), for the cooldown and the hourly limit. */
  sends: Map<string, number[]>;
  linkFailures: number[];
}

let state: EmailState = seed();

const lower = (email: string) => email.trim().toLowerCase();

function seedToken({
  token,
  kind,
  account,
  state: tokenState,
}: (typeof DEMO_EMAIL_TOKENS)[number]): MockToken {
  const now = Date.now();
  const life = kind === "RESET" ? RESET_LINK_MS : VERIFY_LINK_MS;
  const expired = tokenState === "EXPIRED";
  return {
    token,
    kind,
    account,
    address: kind === "CHANGE" ? (DEMO_PENDING_EMAILS[account] ?? account) : account,
    expiresAt: expired ? now - MINUTE : now + life - 10 * MINUTE,
    usedAt: tokenState === "USED" ? now - 5 * MINUTE : undefined,
    cancelledAt: tokenState === "CANCELLED" ? now - 15 * MINUTE : undefined,
  };
}

function seed(): EmailState {
  return {
    tokens: DEMO_EMAIL_TOKENS.map(seedToken),
    unverified: new Set(DEMO_UNVERIFIED_EMAILS),
    pending: new Map(Object.entries(DEMO_PENDING_EMAILS)),
    sends: new Map(),
    linkFailures: [],
  };
}

const PATHS = { VERIFY: "/verify-email/", CHANGE: "/verify-email/", RESET: "/reset-password/" };

function seedMails(): MockMail[] {
  const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * MINUTE).toISOString();
  return DEMO_EMAIL_TOKENS.map((demo, index) => ({
    id: `mail_seed_${index + 1}`,
    to: seedToken(demo).address,
    kind: demo.kind,
    language: "en" as Language,
    path: `${PATHS[demo.kind]}${demo.token}`,
    sentAt: minutesAgo(demo.state === "EXPIRED" ? 26 * 60 : 30 + index),
  })).sort((a, b) => b.sentAt.localeCompare(a.sentAt));
}

/** Back to the demo data. Tests call this between cases. */
export function resetMockEmail(): void {
  state = seed();
  resetMailbox(seedMails());
}

resetMockEmail();

/** AuthUser, Profile and OperatorProfile carry these (contract, ADR 0006). */
export function emailStatus(email: string): {
  emailVerified: boolean;
  pendingEmail: string | null;
} {
  const key = lower(email);
  return {
    emailVerified: !state.unverified.has(key),
    pendingEmail: state.pending.get(key) ?? null,
  };
}

/** A new account starts unverified (registration). */
export function markUnverified(email: string): void {
  state.unverified.add(lower(email));
}

// ----- limits -----

/** Seconds to wait before another email to this address, or 0. */
function sendWait(address: string): number {
  const now = Date.now();
  const recent = (state.sends.get(lower(address)) ?? []).filter((time) => time > now - HOUR);
  state.sends.set(lower(address), recent);
  const last = recent[recent.length - 1];
  const cooldown = last === undefined ? 0 : last + SEND_COOLDOWN_MS - now;
  const hourly = recent.length >= SENDS_PER_HOUR ? (recent[0] ?? now) + HOUR - now : 0;
  return Math.max(0, cooldown, hourly) / 1000;
}

/** When the address may get its next email (for VerificationSent.resendAvailableAt). */
const nextSendAt = (address: string) =>
  new Date(Date.now() + sendWait(address) * 1000).toISOString();

const countSend = (address: string) =>
  state.sends.set(lower(address), [...(state.sends.get(lower(address)) ?? []), Date.now()]);

function linkFailuresWait(): number {
  const since = Date.now() - LINK_FAILURES_WINDOW_MS;
  state.linkFailures = state.linkFailures.filter((time) => time > since);
  if (state.linkFailures.length < LINK_FAILURES_LIMIT) return 0;
  return ((state.linkFailures[0] ?? Date.now()) + LINK_FAILURES_WINDOW_MS - Date.now()) / 1000;
}

function failedLink(response: Response): Response {
  state.linkFailures.push(Date.now());
  return response;
}

// ----- sending -----

function newToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/** Makes a link, cancels the account's previous one of the same kind, and "sends" it. */
function send(account: StoredAccount, kind: MockToken["kind"], address: string): void {
  const now = Date.now();
  for (const token of state.tokens) {
    const sameKind = kind === "RESET" ? token.kind === "RESET" : token.kind !== "RESET";
    if (token.account === account.email && sameKind && !token.usedAt && !token.cancelledAt) {
      token.cancelledAt = now;
    }
  }
  const token: MockToken = {
    token: newToken(),
    kind,
    account: account.email,
    address,
    expiresAt: now + (kind === "RESET" ? RESET_LINK_MS : VERIFY_LINK_MS),
  };
  state.tokens.push(token);
  countSend(address);
  deliver({
    to: address,
    kind,
    language: account.preferredLanguage,
    path: `${PATHS[kind]}${token.token}`,
    sentAt: new Date(now).toISOString(),
  });
  addAudit({
    actor: account.name,
    actorRole: account.role,
    action: kind === "RESET" ? "PASSWORD_RESET_REQUESTED" : "EMAIL_VERIFICATION_SENT",
    target: account.name,
  });
}

/** After registration or an admin's correction: a verification link to the sign-in address. */
export function sendVerification(account: StoredAccount): void {
  markUnverified(account.email);
  send(account, "VERIFY", account.email);
}

/** What the signed-in resend sends to: a pending new address, else an unverified sign-in one. */
function verificationTarget(account: StoredAccount) {
  const status = emailStatus(account.email);
  if (status.pendingEmail) return { kind: "CHANGE" as const, address: status.pendingEmail };
  if (!status.emailVerified) return { kind: "VERIFY" as const, address: account.email };
  return null;
}

type TokenProblem = "INVALID" | "EXPIRED" | "USED" | "CANCELLED";

function tokenState(token: MockToken | undefined): TokenProblem | "OK" {
  if (!token) return "INVALID";
  if (token.cancelledAt) return "CANCELLED";
  if (token.usedAt) return "USED";
  if (token.expiresAt <= Date.now()) return "EXPIRED";
  return "OK";
}

const findToken = (value: string, kinds: MockToken["kind"][]) =>
  state.tokens.find((token) => token.token === value && kinds.includes(token.kind));

function resetProblem(problem: TokenProblem) {
  switch (problem) {
    case "INVALID":
      return failedLink(fail(404, "RESET_TOKEN_INVALID"));
    case "USED":
      return failedLink(fail(409, "RESET_TOKEN_USED"));
    case "EXPIRED":
      return failedLink(fail(410, "RESET_TOKEN_EXPIRED"));
    case "CANCELLED":
      return failedLink(fail(410, "RESET_TOKEN_CANCELLED"));
  }
}

/** A usable reset link, or the error response that says why not. */
function usableReset(value: string): MockToken | Response {
  const wait = linkFailuresWait();
  if (wait > 0) return failRateLimited(wait);
  const token = findToken(value, ["RESET"]);
  const problem = tokenState(token);
  return problem === "OK" && token ? token : resetProblem(problem as TokenProblem);
}

export const emailHandlers = [
  on.post("/auth/password-reset-requests", async ({ request }) => {
    await delay();
    const body = (await request.json().catch(() => ({}))) as { email?: unknown };
    const email = typeof body.email === "string" ? lower(body.email) : "";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail(422, "VALIDATION_FAILED");
    // Limited by the address asked for, whether or not it has an account.
    const wait = sendWait(`reset:${email}`);
    if (wait > 0) return failRateLimited(wait);
    countSend(`reset:${email}`);
    const account = mockAccount(email);
    if (account && account.state === "ACTIVE" && emailStatus(email).emailVerified) {
      send(account, "RESET", account.email);
    }
    return new HttpResponse(null, { status: 202 });
  }),

  on.get("/auth/password-resets/{token}", async ({ params }) => {
    await delay();
    const token = usableReset(params.token);
    if (token instanceof Response) return token;
    return HttpResponse.json({ expiresAt: new Date(token.expiresAt).toISOString() });
  }),

  on.post("/auth/password-resets/{token}/completion", async ({ params, request }) => {
    await delay();
    const token = usableReset(params.token);
    if (token instanceof Response) return token;
    const body = (await request.json().catch(() => ({}))) as { password?: unknown };
    if (typeof body.password !== "string" || !PASSWORD_RULE.test(body.password)) {
      return fail(422, "VALIDATION_FAILED");
    }
    const account = mockAccount(token.account);
    if (!account) return resetProblem("INVALID");
    token.usedAt = Date.now();
    setAccountPassword(account.email, body.password);
    // Every session of the account ends; this browser is not signed in either.
    revokeSessions(account.email);
    addAudit({
      actor: account.name,
      actorRole: account.role,
      action: "PASSWORD_RESET_COMPLETED",
      target: account.name,
    });
    return new HttpResponse(null, { status: 204 });
  }),

  on.post("/auth/email-verification", async () => {
    await delay();
    const account = currentAccount();
    if (!account) return fail(401, "UNAUTHENTICATED");
    const target = verificationTarget(account);
    if (!target) return fail(409, "EMAIL_ALREADY_VERIFIED");
    const wait = sendWait(target.address);
    if (wait > 0) return failRateLimited(wait);
    send(account, target.kind, target.address);
    return HttpResponse.json(
      { sentTo: target.address, resendAvailableAt: nextSendAt(target.address) },
      { status: 202 },
    );
  }),

  on.post("/auth/email-verification-requests", async ({ request }) => {
    await delay();
    const body = (await request.json().catch(() => ({}))) as { email?: unknown };
    const email = typeof body.email === "string" ? lower(body.email) : "";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail(422, "VALIDATION_FAILED");
    const wait = sendWait(email);
    if (wait > 0) return failRateLimited(wait);
    const account = mockAccount(email);
    if (account && !emailStatus(email).emailVerified) send(account, "VERIFY", account.email);
    else countSend(email);
    return new HttpResponse(null, { status: 202 });
  }),

  on.post("/auth/email-verifications/{token}", async ({ params }) => {
    await delay();
    const wait = linkFailuresWait();
    if (wait > 0) return failRateLimited(wait);
    const token = findToken(params.token, ["VERIFY", "CHANGE"]);
    const problem = tokenState(token);
    if (problem === "INVALID" || problem === "CANCELLED" || !token) {
      return failedLink(fail(404, "VERIFICATION_TOKEN_INVALID"));
    }
    if (problem === "USED") return failedLink(fail(409, "EMAIL_ALREADY_VERIFIED"));
    if (problem === "EXPIRED") return failedLink(fail(410, "VERIFICATION_TOKEN_EXPIRED"));

    const account = mockAccount(token.account);
    if (!account) return failedLink(fail(404, "VERIFICATION_TOKEN_INVALID"));
    if (token.kind === "CHANGE") {
      if (emailInUse(token.address)) return fail(409, "EMAIL_TAKEN");
      const from = account.email;
      token.usedAt = Date.now();
      state.pending.delete(from);
      state.unverified.delete(from);
      changeAccountEmail(from, token.address);
      for (const other of state.tokens) if (other.account === from) other.account = token.address;
      addAudit({
        actor: account.name,
        actorRole: account.role,
        action: "EMAIL_VERIFIED",
        target: account.name,
      });
      addAudit({
        actor: account.name,
        actorRole: account.role,
        action: "EMAIL_CHANGED",
        target: account.name,
        from,
        to: token.address,
      });
      return HttpResponse.json({ email: token.address, changed: true });
    }
    token.usedAt = Date.now();
    state.unverified.delete(lower(account.email));
    addAudit({
      actor: account.name,
      actorRole: account.role,
      action: "EMAIL_VERIFIED",
      target: account.name,
    });
    return HttpResponse.json({ email: account.email, changed: false });
  }),

  on.post("/auth/email-change", async ({ request }) => {
    await delay();
    const account = currentAccount();
    if (!account) return fail(401, "UNAUTHENTICATED");
    if (account.role === "ADMIN") return fail(403, "FORBIDDEN");
    const body = (await request.json().catch(() => ({}))) as {
      newEmail?: unknown;
      currentPassword?: unknown;
    };
    const newEmail = typeof body.newEmail === "string" ? lower(body.newEmail) : "";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail) || newEmail === account.email) {
      return fail(422, "VALIDATION_FAILED");
    }
    if (body.currentPassword !== account.password) return fail(422, "CURRENT_PASSWORD_WRONG");
    if (emailInUse(newEmail)) return fail(409, "EMAIL_TAKEN");
    const wait = sendWait(newEmail);
    if (wait > 0) return failRateLimited(wait);
    state.pending.set(account.email, newEmail);
    addAudit({
      actor: account.name,
      actorRole: account.role,
      action: "EMAIL_CHANGE_REQUESTED",
      target: account.name,
      to: newEmail,
    });
    send(account, "CHANGE", newEmail);
    return HttpResponse.json(
      { sentTo: newEmail, resendAvailableAt: nextSendAt(newEmail) },
      { status: 202 },
    );
  }),

  on.post("/auth/email-change/cancellation", async () => {
    await delay();
    const account = currentAccount();
    if (!account) return fail(401, "UNAUTHENTICATED");
    if (account.role === "ADMIN") return fail(403, "FORBIDDEN");
    if (!state.pending.has(account.email)) return fail(409, "EMAIL_CHANGE_NOT_PENDING");
    state.pending.delete(account.email);
    for (const token of state.tokens) {
      if (token.account === account.email && token.kind === "CHANGE" && !token.usedAt) {
        token.cancelledAt ??= Date.now();
      }
    }
    return new HttpResponse(null, { status: 204 });
  }),
];
