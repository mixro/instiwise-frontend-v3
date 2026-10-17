import { MessageCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
import { whatsAppUrl } from "@/lib/phone";

/**
 * Click-to-chat shortcut to the team member's WhatsApp (brief 13.2). Opens WhatsApp;
 * nothing said there is saved in INSTIWISE, and the note under it says so.
 */
export function WhatsAppLink({ phone, name }: { phone: string; name: string }) {
  const { t } = useTranslation();

  return (
    <div className="space-y-2">
      <Button asChild className="w-full sm:w-auto">
        <a href={whatsAppUrl(phone)} target="_blank" rel="noopener noreferrer">
          <MessageCircle className="size-4" aria-hidden="true" />
          {t("client.whatsapp.open", { name })}
          <span className="sr-only">{t("client.whatsapp.newTab")}</span>
        </a>
      </Button>
      <p className="text-xs text-muted">{t("client.whatsapp.note")}</p>
    </div>
  );
}
