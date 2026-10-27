import { Check, Copy, MessageCircle } from "lucide-react";
import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";

type Copied = "link" | "code" | "failed" | null;

interface CodeShareProps {
  link: string;
  code: string;
  /** Already translated, e.g. "Invitation link" or "Reset link". */
  linkLabel: string;
  codeLabel: string;
  /** The WhatsApp message, already translated, with the link and code in it. */
  message: string;
}

/**
 * A link and its code, each with a copy button, and a WhatsApp click-to-chat
 * link (wa.me with the text filled in, no API). The sender picks the contact in
 * WhatsApp; nothing is sent from INSTIWISE. Used for invitations and reset codes.
 */
export function CodeShare({ link, code, linkLabel, codeLabel, message }: CodeShareProps) {
  const { t } = useTranslation();
  const ids = { link: useId(), code: useId() };
  const [copied, setCopied] = useState<Copied>(null);

  async function copy(text: string, what: "link" | "code") {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(what);
    } catch {
      setCopied("failed");
    }
  }

  const LinkIcon = copied === "link" ? Check : Copy;
  const CodeIcon = copied === "code" ? Check : Copy;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor={ids.link}>{linkLabel}</Label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            id={ids.link}
            readOnly
            value={link}
            onFocus={(event) => event.currentTarget.select()}
            className="font-mono text-sm"
          />
          <Button className="shrink-0" onClick={() => void copy(link, "link")}>
            <LinkIcon className="size-4" aria-hidden="true" />
            {t("share.copyLink")}
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor={ids.code}>{codeLabel}</Label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            id={ids.code}
            readOnly
            value={code}
            onFocus={(event) => event.currentTarget.select()}
            className="font-mono text-base tracking-widest"
          />
          <Button className="shrink-0" onClick={() => void copy(code, "code")}>
            <CodeIcon className="size-4" aria-hidden="true" />
            {t("share.copyCode")}
          </Button>
        </div>
      </div>

      <p role="status" aria-live="polite" className="min-h-5 text-sm">
        {copied === "link" && t("share.copiedLink")}
        {copied === "code" && t("share.copiedCode")}
        {copied === "failed" && <span className="text-danger-fg">{t("share.copyFailed")}</span>}
      </p>

      <div className="space-y-2">
        <Button asChild variant="primary" className="w-full sm:w-auto">
          <a
            href={`https://wa.me/?text=${encodeURIComponent(message)}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <MessageCircle className="size-4" aria-hidden="true" />
            {t("share.whatsapp")}
            <span className="sr-only"> {t("share.newTab")}</span>
          </a>
        </Button>
        <p className="text-xs text-muted">{t("share.whatsappNote")}</p>
      </div>
    </div>
  );
}
