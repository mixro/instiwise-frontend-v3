import { Mail } from "lucide-react";
import { useState, useSyncExternalStore } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/Button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/Sheet";
import { useLanguage } from "@/hooks/useLanguage";
import { formatDateTime } from "@/lib/format";
import { sentMails, subscribeMailbox } from "@/mocks/mailbox";

/**
 * Demo mode only (loaded through mailbox.ts): the emails the mock backend would
 * have sent (ADR 0006), newest first, each with its link, so someone trying the
 * demo can confirm an address or reset a password without a real inbox.
 */
export function MailboxButton() {
  const { t } = useTranslation();
  const language = useLanguage();
  const mails = useSyncExternalStore(subscribeMailbox, sentMails);
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button size="sm" className="h-8 gap-1.5 px-2 text-xs sm:h-8">
          <Mail className="size-4" aria-hidden="true" />
          {t("dev.demo.mailbox.openCount", { count: mails.length })}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{t("dev.demo.mailbox.title")}</SheetTitle>
          <SheetDescription>{t("dev.demo.mailbox.body")}</SheetDescription>
        </SheetHeader>
        {mails.length === 0 ? (
          <EmptyState icon={Mail} title={t("dev.demo.mailbox.empty")} />
        ) : (
          <ul className="mt-4 space-y-3">
            {mails.map((mail) => (
              <li key={mail.id} className="space-y-1 rounded-lg border border-border p-3 text-sm">
                <p className="font-medium">{t(`dev.demo.mailbox.kinds.${mail.kind}`)}</p>
                <p className="break-all text-muted">
                  {t("dev.demo.mailbox.to", { email: mail.to })}
                </p>
                <p className="text-xs text-muted">
                  {t("dev.demo.mailbox.sent", { time: formatDateTime(mail.sentAt, language) })}
                  {" · "}
                  {t("dev.demo.mailbox.language", { language: t(`language.${mail.language}`) })}
                </p>
                <Button asChild size="sm" variant="primary" className="mt-1">
                  <Link to={mail.path} onClick={() => setOpen(false)}>
                    {t("dev.demo.mailbox.openLink")}
                  </Link>
                </Button>
              </li>
            ))}
          </ul>
        )}
      </SheetContent>
    </Sheet>
  );
}
