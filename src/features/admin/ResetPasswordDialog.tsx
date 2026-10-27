import { KeyRound } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { CodeShare } from "@/components/CodeShare";
import { Button } from "@/components/ui/Button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";
import type { ResetCodeIssued, ResetCodeStatus } from "@/features/auth/api";
import { useErrorText } from "@/hooks/useErrorText";
import { useLanguage } from "@/hooks/useLanguage";
import { useSession } from "@/hooks/useSession";
import { useToast } from "@/hooks/useToast";
import { formatDateTime } from "@/lib/format";
import { adminApi } from "./api";
import { useRefreshAll } from "./queries";

interface ResetPasswordDialogProps {
  /** A client or an operator, with their active reset code's times (never the code). */
  account: { id: string; name: string; resetCode: ResetCodeStatus };
  onClose: () => void;
}

/**
 * Issue a one-time reset code (ADR 0005): confirm, then show the code once with
 * copy and WhatsApp share. Closing forgets it; nobody can see it again. When the
 * account already has an active code, offer to cancel it or issue a new one.
 */
export function ResetPasswordDialog({ account, onClose }: ResetPasswordDialogProps) {
  const { t } = useTranslation();
  const language = useLanguage();
  const { apiError } = useErrorText();
  const { toast } = useToast();
  const { user } = useSession();
  const refresh = useRefreshAll();
  const [issued, setIssued] = useState<ResetCodeIssued | null>(null);
  const [pending, setPending] = useState<"issue" | "cancel" | null>(null);
  const [error, setError] = useState<string>();
  const active = account.resetCode;
  const when = (value: string) => formatDateTime(value, language);

  async function issue() {
    setError(undefined);
    setPending("issue");
    try {
      setIssued(await adminApi.issueResetCode(account.id));
      void refresh();
    } catch (failure) {
      setError(apiError(failure));
    } finally {
      setPending(null);
    }
  }

  async function cancel() {
    setError(undefined);
    setPending("cancel");
    try {
      await adminApi.cancelResetCode(account.id);
      toast({ variant: "success", title: t("admin.reset.cancelled", { name: account.name }) });
      void refresh();
      onClose();
    } catch (failure) {
      setError(apiError(failure));
    } finally {
      setPending(null);
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        // Not half-way through a request; closing after issuing forgets the code.
        if (!open && !pending) onClose();
      }}
    >
      <DialogContent>
        {issued ? (
          <>
            <DialogHeader>
              <DialogTitle>{t("admin.reset.codeTitle", { name: account.name })}</DialogTitle>
              <DialogDescription>
                {t("admin.reset.codeBody", { name: account.name, expires: when(issued.expiresAt) })}
              </DialogDescription>
            </DialogHeader>
            <CodeShare
              link={issued.link}
              code={issued.code}
              linkLabel={t("admin.reset.link")}
              codeLabel={t("admin.reset.code")}
              message={t("admin.reset.message", {
                admin: user?.name ?? "",
                link: issued.link,
                code: issued.code,
                expires: when(issued.expiresAt),
              })}
            />
            <DialogFooter>
              <DialogClose asChild>
                <Button>{t("admin.reset.done")}</Button>
              </DialogClose>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>
                {active
                  ? t("admin.reset.activeTitle", { name: account.name })
                  : t("admin.reset.issueTitle", { name: account.name })}
              </DialogTitle>
              <DialogDescription>
                {active
                  ? t("admin.reset.activeBody", {
                      issued: when(active.issuedAt),
                      by: active.issuedBy.name,
                      expires: when(active.expiresAt),
                    })
                  : t("admin.reset.issueBody", { name: account.name })}
              </DialogDescription>
            </DialogHeader>
            {active && (
              <p className="flex gap-2 rounded-md border border-border bg-surface-muted p-3 text-sm">
                <KeyRound className="mt-0.5 size-4 shrink-0 text-brand-text" aria-hidden="true" />
                {t("admin.reset.activeChoice")}
              </p>
            )}
            {error && (
              <p role="alert" className="rounded-lg bg-danger-bg px-4 py-2 text-sm text-danger-fg">
                {error}
              </p>
            )}
            <DialogFooter>
              <DialogClose asChild>
                <Button disabled={pending !== null}>{t("ui.cancel")}</Button>
              </DialogClose>
              {active && (
                <Button
                  variant="danger"
                  loading={pending === "cancel"}
                  disabled={pending === "issue"}
                  onClick={() => void cancel()}
                >
                  {t("admin.reset.cancelCode")}
                </Button>
              )}
              <Button
                variant="primary"
                loading={pending === "issue"}
                disabled={pending === "cancel"}
                onClick={() => void issue()}
              >
                {active ? t("admin.reset.issueNew") : t("admin.reset.issue")}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
