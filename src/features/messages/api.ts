import { apiClient } from "@/lib/api";
import type { Operation, QueryOf, Schema } from "@/lib/contract/types";

/*
 * Staff messaging (contracts/openapi.yaml; decided 2026-10-18 and 2026-10-21).
 * - Operators: an inbox of their assigned clients' project conversations; they
 *   read, reply and mark read. Nothing else is ever returned (ADR 0002).
 * - Admins: every conversation, read-only. Every list view and every opened
 *   conversation is written to the audit log by the server, so admin screens do
 *   not poll.
 * Text only; WhatsApp stays a click-to-chat link. Served by src/mocks/messages.ts.
 */

export type ConversationSummary = Schema<"ConversationSummary">;
export type ConversationPage = Schema<"ConversationPage">;
export type OperatorConversationFilters = QueryOf<Operation<"/operator/conversations", "get">>;
export type AdminConversationFilters = QueryOf<Operation<"/admin/conversations", "get">>;

const project = (projectId: string) => ({ path: { projectId } });

export const messagesApi = {
  operator: {
    conversations: (filters: OperatorConversationFilters) =>
      apiClient.GET("/operator/conversations", { query: filters }),
    messages: (projectId: string) =>
      apiClient.GET("/operator/projects/{projectId}/messages", project(projectId)),
    send: (projectId: string, body: string) =>
      apiClient.POST("/operator/projects/{projectId}/messages", {
        ...project(projectId),
        body: { body },
      }),
    markRead: (projectId: string) =>
      apiClient.POST("/operator/projects/{projectId}/messages/read", project(projectId)),
  },
  admin: {
    conversations: (filters: AdminConversationFilters) =>
      apiClient.GET("/admin/conversations", { query: filters }),
    messages: (projectId: string) =>
      apiClient.GET("/admin/projects/{projectId}/messages", project(projectId)),
  },
};
