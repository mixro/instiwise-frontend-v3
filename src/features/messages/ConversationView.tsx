import { ArrowLeft, ShieldCheck } from "lucide-react";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { WhatsAppLink } from "@/features/client/WhatsAppLink";
import type { ConversationSummary } from "./api";
import { messagesApi } from "./api";
import { MessageThread } from "./MessageThread";
import { useRefreshInbox, useThread, type StaffRole } from "./queries";

interface ConversationViewProps {
  role: StaffRole;
  base: string;
  projectId: string;
  /** The inbox row, when the list has it (names, phone, unread count). */
  summary?: ConversationSummary;
}

/**
 * One conversation for staff. Operators reply and mark it read on opening.
 * Admins read only; the server records every opening, and the note says so.
 */
export function ConversationView({ role, base, projectId, summary }: ConversationViewProps) {
  const { t } = useTranslation();
  const messages = useThread(role, projectId);
  const refreshInbox = useRefreshInbox();
  const unread = summary?.unreadCount ?? 0;

  // Opening the conversation reads it (operators only; admins mark nothing read).
  useEffect(() => {
    if (role !== "OPERATOR" || unread === 0) return;
    void messagesApi.operator.markRead(projectId).then(() => refreshInbox("OPERATOR"));
  }, [role, projectId, unread, refreshInbox]);

  return (
    <section aria-labelledby="conversation-title" className="space-y-4">
      <Link
        to={base}
        className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-brand-text underline underline-offset-4 lg:hidden"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        {t("inbox.back")}
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
        <div className="min-w-0">
          <h2 id="conversation-title" className="text-lg font-semibold">
            {summary?.clientName ?? t("client.messages.conversation")}
          </h2>
          {summary && (
            <p className="text-sm text-muted">
              {summary.projectTitle} · {summary.projectReference}
            </p>
          )}
          {role === "ADMIN" && summary && (
            <p className="text-sm text-muted">
              {summary.operatorName
                ? t("inbox.operatorLabel", { name: summary.operatorName })
                : t("inbox.noOperator")}
            </p>
          )}
        </div>
        {role === "OPERATOR" && summary && (
          <Link
            to={`/operator/clients/${summary.clientId}`}
            className="inline-flex min-h-11 items-center text-sm font-medium text-brand-text underline underline-offset-4 sm:min-h-0"
          >
            {t("inbox.openClient")}
          </Link>
        )}
      </header>

      <MessageThread
        messages={messages}
        send={
          role === "OPERATOR"
            ? (body) =>
                messagesApi.operator.send(projectId, body).then(() => refreshInbox("OPERATOR"))
            : undefined
        }
        readOnlyNote={role === "ADMIN" ? t("inbox.readOnly") : undefined}
        empty={{ title: t("inbox.threadEmpty"), description: t(`inbox.threadEmptyBody.${role}`) }}
        before={
          role === "ADMIN" ? (
            <div
              role="note"
              className="flex gap-2 rounded-lg border border-border bg-warning-bg p-3 text-sm text-warning-fg"
            >
              <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <p>
                <span className="font-semibold">{t("inbox.audited")}.</span>{" "}
                {t("inbox.auditedBody")}
              </p>
            </div>
          ) : (
            summary?.clientPhone && (
              <details className="rounded-lg border border-border bg-surface px-4 py-2 text-sm">
                <summary className="flex min-h-11 cursor-pointer items-center font-medium">
                  {t("client.messages.urgent")}
                </summary>
                <div className="pt-2 pb-2">
                  <WhatsAppLink phone={summary.clientPhone} name={summary.clientName} />
                </div>
              </details>
            )
          )
        }
      />
    </section>
  );
}
