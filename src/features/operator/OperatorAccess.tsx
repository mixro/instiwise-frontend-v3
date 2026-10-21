import { Check, Minus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { StatusBadge } from "@/components/StatusBadge";
import { useLanguage } from "@/hooks/useLanguage";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/format";
import type { OperatorProfile } from "./api";

const PERMISSIONS = ["canInviteClients", "canCreateProjects"] as const;

function Item({ allowed, title, body }: { allowed: boolean; title: string; body: string }) {
  const { t } = useTranslation();
  const Icon = allowed ? Check : Minus;
  return (
    <li className="flex gap-3 py-3">
      <Icon
        className={cn("mt-0.5 size-4 shrink-0", allowed ? "text-brand-text" : "text-muted")}
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-baseline justify-between gap-x-3 font-medium">
          <span>{title}</span>
          <span className={cn("text-sm", allowed ? "text-brand-text" : "text-muted")}>
            {allowed ? t("operator.profile.allowed") : t("operator.profile.notAllowed")}
          </span>
        </p>
        <p className="text-sm text-muted">{body}</p>
      </div>
    </li>
  );
}

/**
 * Status, how many clients are assigned (a count only, nothing about them) and
 * what an admin allowed: read-only, explained in plain words.
 */
export function OperatorAccess({ profile }: { profile: OperatorProfile }) {
  const { t } = useTranslation();
  const language = useLanguage();

  return (
    <div className="space-y-4">
      <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-muted">{t("operator.profile.status")}</dt>
          <dd className="mt-1">
            <StatusBadge kind="operator" status={profile.status} />
          </dd>
        </div>
        <div>
          <dt className="text-muted">{t("operator.profile.registered")}</dt>
          <dd className="mt-1 font-medium">
            <time dateTime={profile.registeredAt}>
              {formatDate(profile.registeredAt, language)}
            </time>
          </dd>
        </div>
        <div>
          <dt className="text-muted">{t("operator.profile.assignedClients")}</dt>
          <dd className="mt-1 font-medium">
            {t("operator.profile.clientCount", { count: profile.assignedClientCount })}
          </dd>
        </div>
      </dl>

      <div>
        <h3 className="font-semibold">{t("operator.profile.permissionsTitle")}</h3>
        <p className="text-sm text-muted">{t("operator.profile.permissionsIntro")}</p>
        <ul
          aria-label={t("operator.profile.permissionsTitle")}
          className="mt-2 divide-y divide-border"
        >
          <Item
            allowed
            title={t("operator.profile.always.title")}
            body={t("operator.profile.always.body")}
          />
          {PERMISSIONS.map((permission) => (
            <Item
              key={permission}
              allowed={profile.permissions[permission]}
              title={t(`operator.profile.permissions.${permission}.title`)}
              body={t(`operator.profile.permissions.${permission}.body`)}
            />
          ))}
        </ul>
      </div>
    </div>
  );
}
