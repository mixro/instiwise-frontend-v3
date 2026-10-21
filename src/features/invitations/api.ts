import { apiClient } from "@/lib/api";
import type { Operation, QueryOf, Schema } from "@/lib/contract/types";

/*
 * Staff invitations (contracts/openapi.yaml; decided 2026-10-18 and 2026-10-21).
 * - Admins invite clients and operators, see every invitation and revoke any.
 * - Operators with permissions.canInviteClients invite clients only, who are
 *   assigned to them on registration; they see and revoke only their own.
 * An invitation works once and expires after the admin's invitationValidityDays.
 * Served by src/mocks/invitations.ts until the backend exists.
 */

export type StaffInvitation = Schema<"StaffInvitation">;
export type InvitationRole = StaffInvitation["role"];
export type AdminInvitationBody = Schema<"AdminInvitationRequest">;
export type AdminInvitationFilters = QueryOf<Operation<"/admin/invitations", "get">>;

/** The most a label may hold (contract InvitationLabel). */
export const LABEL_MAX = 100;

const code = (invitationCode: string) => ({ path: { code: invitationCode } });

export const invitationsApi = {
  operator: {
    list: () => apiClient.GET("/operator/invitations"),
    create: (label?: string) =>
      apiClient.POST("/operator/invitations", { body: label ? { label } : {} }),
    revoke: (invitationCode: string) =>
      apiClient.POST("/operator/invitations/{code}/revocation", {
        ...code(invitationCode),
        body: {},
      }),
  },
  admin: {
    list: (filters: AdminInvitationFilters) =>
      apiClient.GET("/admin/invitations", { query: filters }),
    create: (body: AdminInvitationBody) => apiClient.POST("/admin/invitations", { body }),
    revoke: (invitationCode: string) =>
      apiClient.POST("/admin/invitations/{code}/revocation", { ...code(invitationCode), body: {} }),
  },
};
