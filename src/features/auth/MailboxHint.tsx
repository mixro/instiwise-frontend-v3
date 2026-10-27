import { FlaskConical } from "lucide-react";
import { useTranslation } from "react-i18next";

/** Under "check your email" screens in the demo: no email is really sent. */
export function MailboxHint() {
  const { t } = useTranslation();
  return (
    <p className="mt-6 flex items-start gap-2 rounded-lg border border-border bg-warning-bg px-4 py-3 text-sm text-warning-fg">
      <FlaskConical className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      {t("dev.demo.mailbox.hint")}
    </p>
  );
}
