import { useQuery } from "@tanstack/react-query";
import { FlaskConical } from "lucide-react";
import { startTransition, Suspense, useId } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { useSession } from "@/hooks/useSession";
import { getHealth } from "@/lib/api";
import { ROLES, isRole } from "@/lib/roles";
import { MOCK_SIGNED_OUT } from "@/lib/session-context";
import { MailboxButton } from "./mailbox";

function ApiStatus() {
  const { t } = useTranslation();
  const health = useQuery({ queryKey: ["health"], queryFn: getHealth, retry: false });

  if (health.isPending) return <span>{t("dev.api.checking")}</span>;
  if (health.isError) return <span>{t("dev.api.unreachable")}</span>;
  return <span>{t("dev.api.connected", { version: health.data.version })}</span>;
}

/** Demo and development builds only: switch the mock role and see whether the API is up. */
export function DevToolbar() {
  const { t } = useTranslation();
  const { user, setMockRole } = useSession();
  const navigate = useNavigate();
  const labelId = useId();
  const triggerId = useId();

  if (!setMockRole) return null;

  return (
    <div className="border-b border-border bg-warning-bg text-xs text-warning-fg">
      <div className="mx-auto flex min-h-10 max-w-6xl flex-wrap items-center gap-x-4 gap-y-1 px-4 py-1">
        <FlaskConical className="size-4 shrink-0" aria-hidden="true" />
        <span id={labelId} className="font-medium">
          {t("dev.mockRole")}
        </span>
        <Select
          value={user?.role ?? MOCK_SIGNED_OUT}
          onValueChange={(value) => {
            // One transition (the router's navigate is one), so the new role and
            // the new address arrive together: never the old page with the new role.
            startTransition(() => {
              setMockRole(isRole(value) ? value : null);
              navigate("/");
            });
          }}
        >
          <SelectTrigger
            id={triggerId}
            // Label plus current value, so the name contains the visible text.
            aria-labelledby={`${labelId} ${triggerId}`}
            className="h-8 w-auto gap-2 px-2 text-xs sm:h-8"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ROLES.map((role) => (
              <SelectItem key={role} value={role}>
                {t(`roles.${role}`)}
              </SelectItem>
            ))}
            <SelectItem value={MOCK_SIGNED_OUT}>{t("dev.signedOut")}</SelectItem>
          </SelectContent>
        </Select>
        {MailboxButton && (
          <Suspense fallback={null}>
            <MailboxButton />
          </Suspense>
        )}
        <span className="ml-auto">
          <ApiStatus />
        </span>
      </div>
    </div>
  );
}
