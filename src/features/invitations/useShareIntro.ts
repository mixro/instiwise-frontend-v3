import { useTranslation } from "react-i18next";
import { useLanguage } from "@/hooks/useLanguage";
import { formatDate } from "@/lib/format";
import type { StaffInvitation } from "./api";

/** "Send the link… expires on 28 Oct 2026": the dialog description above InvitationShare. */
export function useShareIntro(invitation: StaffInvitation | null): string {
  const { t } = useTranslation();
  const language = useLanguage();
  return invitation
    ? t("invitations.share.body", { date: formatDate(invitation.expiresAt, language) })
    : "";
}
