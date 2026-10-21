import { delay, HttpResponse } from "msw";
import type { Invitation } from "@/features/auth/api";
import type { InvitationStatus } from "@/lib/status";
import type { StaffInvitation } from "@/features/invitations/api";
import { addAudit, MOCK_ADMIN, operatorById, staffState } from "./admin-store";
import { fail, on } from "./contract";
import { DEMO_CODES } from "./demo-data";
import { MOCK_ADMIN_ID, MOCK_OPERATOR, MOCK_OPERATOR_ID, type MockInvitation } from "./staff-seed";

/*
 * Staff invitations (decided 2026-10-18 and 2026-10-21), enforced as the server will:
 * - admins invite clients and operators; operators with canInviteClients invite
 *   clients only, who are assigned to them when they register;
 * - operators see and revoke only their own invitations (anyone else's is 404);
 *   admins see and revoke every one;
 * - single use; valid for the admin setting invitationValidityDays; only PENDING
 *   ones can be revoked.
 * Codes created here are answered by GET /invitations/{code}, so the whole flow
 * (create, share, register) works end to end in the mock.
 */

const DAY = 24 * 60 * 60 * 1000;
const at = (offsetDays: number) => new Date(Date.now() + offsetDays * DAY).toISOString();

const BARAKA = { id: MOCK_OPERATOR_ID, name: MOCK_OPERATOR, role: "OPERATOR" } as const;
const REHEMA = { id: MOCK_ADMIN_ID, name: MOCK_ADMIN, role: "ADMIN" } as const;
const BARAKA_OPERATOR = { id: BARAKA.id, name: BARAKA.name };

const invitations = () => staffState().invitations;

export function invitationStatus(invitation: MockInvitation): InvitationStatus {
  if (invitation.revokedAt) return "REVOKED";
  if (invitation.acceptedAt) return invitation.rejected ? "REJECTED" : "ACCEPTED";
  if (Date.parse(invitation.expiresAt) <= Date.now()) return "EXPIRED";
  return "PENDING";
}

/** As the API returns it: status worked out, and the link to share. */
function present(invitation: MockInvitation): StaffInvitation {
  // Field by field: the internal `rejected` and `acceptedEmail` never leave the server.
  return {
    code: invitation.code,
    role: invitation.role,
    label: invitation.label,
    operator: invitation.operator,
    inviter: invitation.inviter,
    createdAt: invitation.createdAt,
    expiresAt: invitation.expiresAt,
    acceptedAt: invitation.acceptedAt,
    acceptedBy: invitation.acceptedBy,
    revokedAt: invitation.revokedAt,
    revokedBy: invitation.revokedBy,
    reason: invitation.reason,
    status: invitationStatus(invitation),
    link: new URL(`/invite/${invitation.code}`, window.location.origin).toString(),
  };
}

const newestFirst = (a: MockInvitation, b: MockInvitation) =>
  b.createdAt.localeCompare(a.createdAt);

/** 8 characters without look-alikes (0/O, 1/I), shown as XXXX-XXXX. */
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function newCode(): string {
  for (;;) {
    const bytes = crypto.getRandomValues(new Uint8Array(8));
    const raw = Array.from(bytes, (byte) => ALPHABET[byte % ALPHABET.length]).join("");
    const code = `${raw.slice(0, 4)}-${raw.slice(4)}`;
    if (!DEMO_CODES[code] && !findInvitation(code)) return code;
  }
}

export function findInvitation(code: string): MockInvitation | undefined {
  return invitations().find((invitation) => invitation.code === code);
}

function create(fields: Pick<MockInvitation, "role" | "label" | "operator" | "inviter">) {
  const days = staffState().settings.invitationValidityDays;
  const invitation: MockInvitation = {
    ...fields,
    code: newCode(),
    createdAt: new Date().toISOString(),
    expiresAt: at(days),
  };
  invitations().push(invitation);
  addAudit({
    actor: fields.inviter.name,
    actorRole: fields.inviter.role,
    action: "INVITATION_CREATED",
    target: invitation.code,
    to: fields.label,
  });
  return HttpResponse.json<StaffInvitation>(present(invitation), { status: 201 });
}

function revoke(
  invitation: MockInvitation,
  by: string,
  byRole: "ADMIN" | "OPERATOR",
  reason: string,
) {
  if (invitationStatus(invitation) !== "PENDING") return fail(409, "INVITATION_NOT_ACTIVE");
  invitation.revokedAt = new Date().toISOString();
  invitation.revokedBy = by;
  invitation.reason = reason || undefined;
  addAudit({
    actor: by,
    actorRole: byRole,
    action: "INVITATION_REVOKED",
    target: invitation.code,
    reason: reason || undefined,
  });
  return HttpResponse.json<StaffInvitation>(present(invitation));
}

async function optionalReason(request: Request): Promise<string> {
  const body = (await request.json().catch(() => ({}))) as { reason?: string };
  return body.reason?.trim() ?? "";
}

const tooLong = (label: string | undefined) => (label?.trim().length ?? 0) > 100;

/** The mock operator's admin-granted permission, read on every request. */
const operatorMayInvite = () => operatorById(MOCK_OPERATOR_ID)?.permissions.canInviteClients;

// ----- the invitee side (GET /invitations/{code} and registration) -----

/** What the public invitation page may learn, or the reason the code cannot be used. */
export function resolveStaffInvitation(code: string): Invitation | ReturnType<typeof fail> | null {
  const invitation = findInvitation(code);
  if (!invitation) return null;
  const status = invitationStatus(invitation);
  if (status === "REVOKED") return fail(410, "INVITATION_REVOKED");
  if (status === "EXPIRED") return fail(410, "INVITATION_EXPIRED");
  if (status !== "PENDING") return fail(409, "INVITATION_ALREADY_USED");
  return {
    code,
    role: invitation.role,
    inviterName: invitation.inviter.name,
    expiresAt: invitation.expiresAt,
  };
}

/** Uses the invitation once. Returns the operator the new client is assigned to, if any. */
export function acceptStaffInvitation(code: string, name: string, email: string) {
  const invitation = findInvitation(code);
  if (!invitation) return undefined;
  invitation.acceptedAt = new Date().toISOString();
  invitation.acceptedBy = name;
  invitation.acceptedEmail = email;
  return invitation.operator;
}

/** An admin turned down the operator who registered with this email. */
export function markInvitationRejected(email: string): void {
  const invitation = invitations().find((i) => i.acceptedEmail === email);
  if (invitation) invitation.rejected = true;
}

// ----- staff endpoints -----

export const invitationHandlers = [
  on.get("/operator/invitations", async () => {
    await delay();
    if (!operatorMayInvite()) return fail(403, "PERMISSION_REQUIRED");
    // Only the operator's own; other operators' and the admin's are never read.
    const mine = invitations().filter((i) => i.inviter.id === MOCK_OPERATOR_ID);
    return HttpResponse.json([...mine].sort(newestFirst).map(present));
  }),

  on.post("/operator/invitations", async ({ request }) => {
    await delay();
    if (!operatorMayInvite()) return fail(403, "PERMISSION_REQUIRED");
    const body = ((await request.json().catch(() => undefined)) ?? {}) as { label?: string };
    if (tooLong(body.label)) return fail(422, "VALIDATION_FAILED");
    return create({
      role: "CLIENT",
      label: body.label?.trim() || undefined,
      operator: BARAKA_OPERATOR,
      inviter: BARAKA,
    });
  }),

  on.post("/operator/invitations/{code}/revocation", async ({ params, request }) => {
    await delay();
    if (!operatorMayInvite()) return fail(403, "PERMISSION_REQUIRED");
    const invitation = findInvitation(params.code);
    // Someone else's invitation answers as if it did not exist.
    if (!invitation || invitation.inviter.id !== MOCK_OPERATOR_ID) {
      return fail(404, "INVITATION_NOT_FOUND");
    }
    return revoke(invitation, BARAKA.name, "OPERATOR", await optionalReason(request));
  }),

  on.get("/admin/invitations", async ({ request }) => {
    await delay();
    const query = new URL(request.url).searchParams;
    const status = query.get("status");
    const inviterId = query.get("inviterId");
    const statuses: InvitationStatus[] = ["PENDING", "ACCEPTED", "EXPIRED", "REVOKED", "REJECTED"];
    if (status && !statuses.includes(status as InvitationStatus)) {
      return fail(422, "VALIDATION_FAILED");
    }
    const rows = invitations().filter(
      (i) =>
        (!status || invitationStatus(i) === status) && (!inviterId || i.inviter.id === inviterId),
    );
    return HttpResponse.json([...rows].sort(newestFirst).map(present));
  }),

  on.post("/admin/invitations", async ({ request }) => {
    await delay();
    const body = await request.json();
    if (body.role !== "CLIENT" && body.role !== "OPERATOR") return fail(422, "VALIDATION_FAILED");
    if (tooLong(body.label)) return fail(422, "VALIDATION_FAILED");
    if (body.role === "OPERATOR" && body.operatorId) return fail(422, "VALIDATION_FAILED");
    let operator: MockInvitation["operator"];
    if (body.operatorId) {
      const found = operatorById(body.operatorId);
      if (!found) return fail(404, "OPERATOR_NOT_FOUND");
      if (found.status !== "ACTIVE") return fail(409, "OPERATOR_NOT_ACTIVE");
      operator = { id: found.id, name: found.name };
    }
    return create({
      role: body.role,
      label: body.label?.trim() || undefined,
      operator,
      inviter: REHEMA,
    });
  }),

  on.post("/admin/invitations/{code}/revocation", async ({ params, request }) => {
    await delay();
    const invitation = findInvitation(params.code);
    if (!invitation) return fail(404, "INVITATION_NOT_FOUND");
    return revoke(invitation, MOCK_ADMIN, "ADMIN", await optionalReason(request));
  }),
];
