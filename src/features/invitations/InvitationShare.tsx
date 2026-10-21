import { Check, Copy, MessageCircle } from "lucide-react";
import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { useLanguage } from "@/hooks/useLanguage";
import { useSession } from "@/hooks/useSession";
import { formatDate } from "@/lib/format";
import type { StaffInvitation } from "./api";

type Copied = "link" | "code" | "failed" | null;

/**
 * The link and the code of an invitation, each with a copy button, and a
 * WhatsApp click-to-chat link (wa.me with the text filled in, no API). The
 * sender picks the contact in WhatsApp; nothing is sent from INSTIWISE.
 */
export function InvitationShare({ invitation }: { invitation: StaffInvitation }) {
  const { t } = useTranslation();
  const language = useLanguage();
  const { user } = useSession();
  const ids = { link: useId(), code: useId() };
  const [copied, setCopied] = useState<Copied>(null);
  const expires = formatDate(invitation.expiresAt, language);

  async function copy(text: string, what: "link" | "code") {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(what);
    } catch {
      setCopied("failed");
    }
  }

  const message = t("invitations.share.message", {
    inviter: user?.name ?? invitation.inviter.name,
    link: invitation.link,
    code: invitation.code,
    date: expires,
  });

  const CopyIcon = (what: "link" | "code") => (copied === what ? Check : Copy);
  const LinkIcon = CopyIcon("link");
  const CodeIcon = CopyIcon("code");

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor={ids.link}>{t("invitations.share.link")}</Label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            id={ids.link}
            readOnly
            value={invitation.link}
            onFocus={(event) => event.currentTarget.select()}
            className="font-mono text-sm"
          />
          <Button className="shrink-0" onClick={() => void copy(invitation.link, "link")}>
            <LinkIcon className="size-4" aria-hidden="true" />
            {t("invitations.share.copyLink")}
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor={ids.code}>{t("invitations.share.code")}</Label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            id={ids.code}
            readOnly
            value={invitation.code}
            onFocus={(event) => event.currentTarget.select()}
            className="font-mono text-base tracking-widest"
          />
          <Button className="shrink-0" onClick={() => void copy(invitation.code, "code")}>
            <CodeIcon className="size-4" aria-hidden="true" />
            {t("invitations.share.copyCode")}
          </Button>
        </div>
      </div>

      <p role="status" aria-live="polite" className="min-h-5 text-sm">
        {copied === "link" && t("invitations.share.copiedLink")}
        {copied === "code" && t("invitations.share.copiedCode")}
        {copied === "failed" && (
          <span className="text-danger-fg">{t("invitations.share.copyFailed")}</span>
        )}
      </p>

      <div className="space-y-2">
        <Button asChild variant="primary" className="w-full sm:w-auto">
          <a
            href={`https://wa.me/?text=${encodeURIComponent(message)}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <MessageCircle className="size-4" aria-hidden="true" />
            {t("invitations.share.whatsapp")}
            <span className="sr-only"> {t("invitations.share.newTab")}</span>
          </a>
        </Button>
        <p className="text-xs text-muted">{t("invitations.share.whatsappNote")}</p>
      </div>
    </div>
  );
}
