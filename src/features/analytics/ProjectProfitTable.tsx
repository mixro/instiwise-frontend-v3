import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { MoneyCell } from "@/components/MoneyCell";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import type { ExpenseRole } from "@/features/expenses/queries";
import type { ProjectFinance } from "@/features/expenses/api";
import { useLanguage } from "@/hooks/useLanguage";
import { formatBasisPoints } from "@/lib/format";

const SHOW = ["all", "active", "loss"] as const;
type Show = (typeof SHOW)[number];

/** Which rows a "Show" choice keeps; the figures themselves are the server's. */
const KEEP: Record<Show, (row: ProjectFinance) => boolean> = {
  all: () => true,
  active: (row) => row.collected !== 0 || row.expenses !== 0,
  loss: (row) => row.profit < 0,
};

/** Agreed, collected, outstanding, variable expenses, profit and margin for each project. */
export function ProjectProfitTable({
  role,
  projects,
}: {
  role: ExpenseRole;
  projects: ProjectFinance[];
}) {
  const { t } = useTranslation();
  const language = useLanguage();
  const searchId = useId();
  const showId = useId();
  const [search, setSearch] = useState("");
  const [show, setShow] = useState<Show>("all");
  const base = role === "ADMIN" ? "/admin" : "/operator";

  const needle = search.trim().toLocaleLowerCase(language);
  const rows = projects.filter(
    (row) =>
      KEEP[show](row) &&
      (!needle ||
        [row.title, row.reference, row.clientName].some((text) =>
          text.toLocaleLowerCase(language).includes(needle),
        )),
  );

  const columns: DataTableColumn<ProjectFinance>[] = [
    {
      id: "project",
      header: t("analytics.projects.project"),
      mobile: "title",
      sortValue: (row) => row.title,
      cell: (row) => (
        <span className="block min-w-0">
          <Link
            to={`${base}/projects/${row.projectId}/agreement`}
            className="font-medium text-brand-text underline-offset-4 hover:underline"
          >
            {row.title}
          </Link>
          <span className="block text-xs text-muted">
            {row.reference} · {row.clientName}
          </span>
        </span>
      ),
    },
    ...(
      [
        ["agreed", "agreedValue"],
        ["collected", "collected"],
        ["outstanding", "outstanding"],
        ["expenses", "expenses"],
        ["profit", "profit"],
      ] as const
    ).map(([label, field]): DataTableColumn<ProjectFinance> => ({
      id: field,
      header: t(`analytics.projects.${label}`),
      numeric: true,
      sortValue: (row) => row[field],
      cell: (row) => <MoneyCell amount={row[field]} />,
    })),
    {
      id: "margin",
      header: t("analytics.projects.margin"),
      numeric: true,
      // No margin (nothing collected) sorts below every real one.
      sortValue: (row) => row.marginBasisPoints ?? Number.NEGATIVE_INFINITY,
      cell: (row) => (
        <span className="tabular block text-right whitespace-nowrap">
          {row.marginBasisPoints === null ? (
            <>
              <span aria-hidden="true">—</span>
              <span className="sr-only">{t("analytics.tiles.marginNone")}</span>
            </>
          ) : (
            formatBasisPoints(row.marginBasisPoints, language)
          )}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex flex-col gap-2 sm:w-72">
          <Label htmlFor={searchId}>{t("analytics.projects.search")}</Label>
          <Input
            id={searchId}
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <div className="flex flex-col gap-2 sm:w-60">
          <Label htmlFor={showId}>{t("analytics.projects.show")}</Label>
          <Select
            value={show}
            onValueChange={(value) => setShow(SHOW.find((option) => option === value) ?? "all")}
          >
            <SelectTrigger id={showId}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SHOW.map((option) => (
                <SelectItem key={option} value={option}>
                  {t(`analytics.projects.${option}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <DataTable
        caption={t("analytics.projects.title")}
        columns={columns}
        rows={rows}
        rowKey={(row) => row.projectId}
        defaultSort={{ columnId: "profit", direction: "desc" }}
        empty={{ title: t("analytics.projects.empty") }}
      />
    </div>
  );
}
