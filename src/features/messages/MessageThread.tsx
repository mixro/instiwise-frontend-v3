import { MessagesSquare, RotateCcw, Send } from "lucide-react";
import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { Button } from "@/components/ui/Button";
import { Label } from "@/components/ui/Label";
import { Skeleton } from "@/components/ui/Skeleton";
import { Textarea } from "@/components/ui/Textarea";
import type { Message } from "@/features/client/api";
import { useLanguage } from "@/hooks/useLanguage";
import { cn } from "@/lib/cn";
import { formatDateTime } from "@/lib/format";

export const MESSAGE_MAX_LENGTH = 2000;

interface OutgoingMessage {
  key: string;
  body: string;
  state: "sending" | "failed";
}

function Bubble({
  mine,
  children,
  footer,
  failed,
}: {
  mine: boolean;
  children: string;
  footer: ReactNode;
  failed?: boolean;
}) {
  return (
    <li className={cn("flex flex-col gap-1", mine ? "items-end" : "items-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-lg border px-4 py-2 text-sm whitespace-pre-wrap break-words",
          mine ? "border-transparent bg-brand-soft text-foreground" : "border-border bg-surface",
          failed && "border-danger-fg",
        )}
      >
        {children}
      </div>
      <div className="text-xs text-muted">{footer}</div>
    </li>
  );
}

/** The parts of a query this component reads (TanStack's UseQueryResult fits). */
export interface ThreadQuery {
  data: Message[] | undefined;
  isPending: boolean;
  isError: boolean;
  error: unknown;
  refetch: () => Promise<unknown>;
}

interface MessageThreadProps {
  messages: ThreadQuery;
  /**
   * Sends one message. Resolve when it is stored (the thread then reloads),
   * reject to keep it as "not sent" with a retry. Leave out for read-only.
   */
  send?: (body: string) => Promise<unknown>;
  /** Shown in place of the send box when `send` is left out. */
  readOnlyNote?: string;
  /** Empty-state copy for this side of the conversation. */
  empty: { title: string; description?: string };
  /** Above the messages: a WhatsApp shortcut, an audit note… */
  before?: ReactNode;
}

/**
 * One project's conversation, text only (brief 13.1): sender and time on every
 * message, unsent messages kept with a retry. Shared by the client's Messages
 * tab and the staff inbox; each side brings its own data, sending and read rules.
 */
export function MessageThread({ messages, send, readOnlyNote, empty, before }: MessageThreadProps) {
  const { t } = useTranslation();
  const language = useLanguage();
  const [draft, setDraft] = useState("");
  const [outgoing, setOutgoing] = useState<OutgoingMessage[]>([]);
  const endRef = useRef<HTMLDivElement>(null);
  const inputId = useId();
  const count = messages.data?.length ?? 0;

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [count, outgoing.length]);

  async function deliver(item: OutgoingMessage) {
    if (!send) return;
    setOutgoing((list) =>
      list.map((entry) => (entry.key === item.key ? { ...entry, state: "sending" } : entry)),
    );
    try {
      await send(item.body);
      await messages.refetch();
      setOutgoing((list) => list.filter((entry) => entry.key !== item.key));
    } catch {
      setOutgoing((list) =>
        list.map((entry) => (entry.key === item.key ? { ...entry, state: "failed" } : entry)),
      );
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    const body = draft.trim();
    if (!body) return;
    const item: OutgoingMessage = { key: `out_${Date.now()}`, body, state: "sending" };
    setOutgoing((list) => [...list, item]);
    setDraft("");
    void deliver(item);
  }

  return (
    <div className="space-y-4">
      {before}

      {messages.isPending && (
        <div aria-busy="true" className="space-y-3">
          <Skeleton className="h-12 w-3/4 rounded-lg" />
          <Skeleton className="ml-auto h-12 w-2/3 rounded-lg" />
          <Skeleton className="h-12 w-3/4 rounded-lg" />
        </div>
      )}

      {messages.isError && (
        <ErrorState error={messages.error} onRetry={() => void messages.refetch()} />
      )}

      {messages.data && messages.data.length === 0 && outgoing.length === 0 && (
        <EmptyState icon={MessagesSquare} title={empty.title} description={empty.description} />
      )}

      {messages.data && (messages.data.length > 0 || outgoing.length > 0) && (
        <ol aria-label={t("client.messages.conversation")} className="space-y-4">
          {messages.data.map((message) => (
            <Bubble
              key={message.id}
              mine={message.mine}
              footer={
                <>
                  {message.mine ? t("client.messages.you") : message.senderName} ·{" "}
                  <time dateTime={message.sentAt}>{formatDateTime(message.sentAt, language)}</time>
                </>
              }
            >
              {message.body}
            </Bubble>
          ))}
          {outgoing.map((item) => (
            <Bubble
              key={item.key}
              mine
              failed={item.state === "failed"}
              footer={
                item.state === "sending" ? (
                  t("client.messages.sending")
                ) : (
                  <span
                    role="alert"
                    className="inline-flex flex-wrap items-center gap-2 text-danger-fg"
                  >
                    {t("client.messages.notSent")}
                    <button
                      type="button"
                      onClick={() => void deliver(item)}
                      className="inline-flex min-h-11 items-center gap-1 font-medium underline underline-offset-4 sm:min-h-0"
                    >
                      <RotateCcw className="size-3.5" aria-hidden="true" />
                      {t("ui.retry")}
                    </button>
                  </span>
                )
              }
            >
              {item.body}
            </Bubble>
          ))}
        </ol>
      )}
      <div ref={endRef} />

      {send ? (
        <form onSubmit={submit} className="space-y-2 border-t border-border pt-4">
          <Label htmlFor={inputId}>{t("client.messages.write")}</Label>
          <Textarea
            id={inputId}
            rows={3}
            value={draft}
            maxLength={MESSAGE_MAX_LENGTH}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              // Ctrl/Cmd+Enter sends; Enter alone is a new line (phones have no Ctrl).
              if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) submit(event);
            }}
          />
          <div className="flex items-center justify-between gap-4">
            <p className="text-xs text-muted">{t("client.messages.textOnly")}</p>
            <Button type="submit" variant="primary" disabled={draft.trim() === ""}>
              <Send className="size-4" aria-hidden="true" />
              {t("client.messages.send")}
            </Button>
          </div>
        </form>
      ) : (
        readOnlyNote && (
          <p className="border-t border-border pt-4 text-sm text-muted">{readOnlyNote}</p>
        )
      )}
    </div>
  );
}
