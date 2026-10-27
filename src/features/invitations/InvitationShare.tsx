import { useTranslation } from "react-i18next";
import { CodeShare } from "@/components/CodeShare";
import { useLanguage } from "@/hooks/useLanguage";
import { useSession } from "@/hooks/useSession";
import { formatDate } from "@/lib/format";
import type { StaffInvitation } from "./api";

/** An invitation's link and code to copy, and a WhatsApp click-to-chat message with both. */
export function InvitationShare({ invitation }: { invitation: StaffInvitation }) {
  const { t } = useTranslation();
  const language = useLanguage();
  const { user } = useSession();

  return (
    <CodeShare
      link={invitation.link}
      code={invitation.code}
      linkLabel={t("invitations.share.link")}
      codeLabel={t("invitations.share.code")}
      message={t("invitations.share.message", {
        inviter: user?.name ?? invitation.inviter.name,
        link: invitation.link,
        code: invitation.code,
        date: formatDate(invitation.expiresAt, language),
      })}
    />
  );
}
