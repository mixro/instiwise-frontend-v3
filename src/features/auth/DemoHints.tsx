import { FlaskConical } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { DEMO_ACCOUNTS, DEMO_CODES, DEMO_PASSWORD } from "@/mocks/demo-data";

/** Lists the mock backend's demo accounts and invitation codes (see demo-hints.ts). */
export function DemoHints({ show }: { show: "accounts" | "codes" }) {
  const { t } = useTranslation();

  return (
    <details className="mt-8 rounded-lg border border-border bg-warning-bg px-4 py-3 text-sm text-warning-fg">
      <summary className="flex min-h-11 cursor-pointer items-center gap-2 font-medium sm:min-h-0">
        <FlaskConical className="size-4" aria-hidden="true" />
        {show === "accounts" ? t("dev.demo.accountsTitle") : t("dev.demo.codesTitle")}
      </summary>

      {show === "accounts" ? (
        <div className="mt-3 space-y-2">
          <p>{t("dev.demo.password", { password: DEMO_PASSWORD })}</p>
          <ul className="space-y-1">
            {DEMO_ACCOUNTS.map((account) => (
              <li key={account.email} className="flex flex-wrap gap-x-2">
                <code className="font-mono">{account.email}</code>
                <span>
                  · {t(`roles.${account.role}`)} · {t(`dev.demo.states.${account.state}`)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="mt-3 space-y-2">
          <ul className="space-y-1">
            {Object.entries(DEMO_CODES).map(([code, outcome]) => (
              <li key={code} className="flex flex-wrap gap-x-2">
                <Link to={`/invite/${code}`} className="font-mono underline underline-offset-4">
                  {code}
                </Link>
                <span>· {t(`dev.demo.codes.${outcome}`)}</span>
              </li>
            ))}
            <li>{t("dev.demo.codes.other")}</li>
          </ul>
          <p>{t("dev.demo.emailTaken")}</p>
        </div>
      )}
    </details>
  );
}
