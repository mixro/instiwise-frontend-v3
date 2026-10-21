import { MessagesSquare, RefreshCw } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { ConversationList, type InboxFilters } from "./ConversationList";
import { ConversationView } from "./ConversationView";
import { messageKeys, useConversations, type StaffRole } from "./queries";
import { useQueryClient } from "@tanstack/react-query";

const BASE: Record<StaffRole, string> = {
  OPERATOR: "/operator/messages",
  ADMIN: "/admin/messages",
};

/**
 * The staff inbox: the list and the open conversation side by side from the lg
 * breakpoint; on phones the list, then the conversation with a back link.
 */
export function InboxPage({ role }: { role: StaffRole }) {
  const { t } = useTranslation();
  const { projectId } = useParams();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<InboxFilters>({});
  const conversations = useConversations(role, filters);
  const base = BASE[role];
  const selected = conversations.data?.items.find((c) => c.projectId === projectId);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t(role === "OPERATOR" ? "nav.operator.messages" : "nav.admin.messages")}
        description={t(`inbox.subtitle.${role}`)}
        actions={
          // Admin views never refresh by themselves (each read is audited).
          role === "ADMIN" && (
            <Button
              onClick={() =>
                void queryClient.invalidateQueries({ queryKey: [...messageKeys.all, "ADMIN"] })
              }
            >
              <RefreshCw className="size-4" aria-hidden="true" />
              {t("inbox.refresh")}
            </Button>
          )
        }
      />

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        <div className={cn(projectId && "hidden lg:block")}>
          <ConversationList
            role={role}
            base={base}
            conversations={conversations}
            filters={filters}
            onFiltersChange={setFilters}
            selectedId={projectId}
          />
        </div>
        <div className={cn("min-w-0", !projectId && "hidden lg:block")}>
          {projectId ? (
            <ConversationView
              key={projectId}
              role={role}
              base={base}
              projectId={projectId}
              summary={selected}
            />
          ) : (
            <EmptyState
              icon={MessagesSquare}
              title={t("inbox.choose")}
              description={t("inbox.chooseBody")}
            />
          )}
        </div>
      </div>
    </div>
  );
}
