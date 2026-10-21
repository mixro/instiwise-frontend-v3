import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { MessageThread } from "@/features/messages/MessageThread";
import { clientApi } from "./api";
import { useProjectId } from "./project-tabs";
import { WhatsAppLink } from "./WhatsAppLink";
import { useMessages, useProject, useRefreshClient } from "./queries";

/**
 * The project's own conversation (text only, brief 13.1). Polls for new messages,
 * marks them read when opened, and keeps unsent messages with a retry
 * (MessageThread, shared with the staff inbox).
 */
export function MessagesTab() {
  const { t } = useTranslation();
  const projectId = useProjectId();
  const messages = useMessages(projectId);
  const { data: project } = useProject(projectId);
  const refresh = useRefreshClient();
  const unread = project?.unreadMessages ?? 0;

  // Opening the conversation reads it; refresh the unread counts afterwards.
  useEffect(() => {
    if (unread === 0) return;
    void clientApi.markMessagesRead(projectId).then(() => refresh());
  }, [projectId, unread, refresh]);

  return (
    <MessageThread
      messages={messages}
      send={(body) => clientApi.sendMessage(projectId, body)}
      empty={{ title: t("client.messages.empty"), description: t("client.messages.emptyBody") }}
      before={
        project?.operator.phone && (
          <details className="rounded-lg border border-border bg-surface px-4 py-2 text-sm">
            <summary className="flex min-h-11 cursor-pointer items-center font-medium">
              {t("client.messages.urgent")}
            </summary>
            <div className="pt-2 pb-2">
              <WhatsAppLink phone={project.operator.phone} name={project.operator.name} />
            </div>
          </details>
        )
      }
    />
  );
}
