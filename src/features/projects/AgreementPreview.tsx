import { useTranslation } from "react-i18next";
import type { AgreementVersion } from "@/features/client/api";
import type { Language } from "@/i18n/languages";
import { formatDate, formatTzs } from "@/lib/format";
import { termText, type Term } from "@/lib/terms";
import type { StaffProjectDetail } from "./api";

function List({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div className="space-y-1">
      <h4 className="text-sm font-semibold">{title}</h4>
      <ul className="list-disc space-y-1 pl-5 text-sm">
        {items.map((item, index) => (
          <li key={`${index}-${item}`}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

const inLanguage = (terms: Term[], language: Language) =>
  terms.map((term) => termText(term, language));

/**
 * The project and its agreement as the client will read them, in one language:
 * headings, money and dates in that language, and that copy of every term.
 * Built from what is saved on the server, not from unsaved edits.
 */
export function AgreementPreview({
  project,
  version,
  language,
}: {
  project: Pick<
    StaffProjectDetail,
    "title" | "reference" | "description" | "deliverables" | "category" | "startDate"
  >;
  version: AgreementVersion;
  language: Language;
}) {
  const { i18n } = useTranslation();
  const t = i18n.getFixedT(language);

  return (
    <article lang={language} className="space-y-4 rounded-lg border border-border bg-surface p-4">
      <header className="space-y-1">
        <h3 className="text-lg font-semibold">{project.title}</h3>
        <p className="text-sm text-muted">
          {project.reference} · {t("client.agreement.version", { version: version.version })}
        </p>
      </header>
      {project.description && <p className="text-sm">{project.description}</p>}
      <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-muted">{t("client.agreement.price")}</dt>
          <dd className="tabular text-lg font-semibold">{formatTzs(version.price, language)}</dd>
        </div>
        <div>
          <dt className="text-muted">{t("client.project.deadline")}</dt>
          <dd className="font-semibold">{formatDate(version.deadline, language)}</dd>
        </div>
        <div>
          <dt className="text-muted">{t("client.project.start")}</dt>
          <dd className="font-semibold">{formatDate(project.startDate, language)}</dd>
        </div>
      </dl>
      <List title={t("projects.preview.deliverables")} items={project.deliverables} />
      <List title={t("client.agreement.scope")} items={inLanguage(version.scope, language)} />
      <List
        title={t("client.agreement.exclusions")}
        items={inLanguage(version.exclusions, language)}
      />
      <List
        title={t("client.agreement.paymentTerms")}
        items={inLanguage(version.paymentTerms, language)}
      />
    </article>
  );
}
