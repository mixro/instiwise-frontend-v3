import { ArrowDown, ArrowUp, ArrowUpDown, CircleAlert } from "lucide-react";
import { Fragment, useMemo, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import { useLanguage } from "@/hooks/useLanguage";
import { cn } from "@/lib/cn";

export interface DataTableColumn<Row> {
  id: string;
  /** Already translated. Also the label of the value on phone cards. */
  header: string;
  cell: (row: Row) => ReactNode;
  /** Makes the column sortable by this value. */
  sortValue?: (row: Row) => string | number;
  /** Right-aligned with tabular figures (amounts, counts). */
  numeric?: boolean;
  /** On phones: "title" heads the card, "hidden" leaves the column out. Default: a label/value line. */
  mobile?: "title" | "hidden";
}

export type SortDirection = "asc" | "desc";

export interface SortState {
  columnId: string;
  direction: SortDirection;
}

interface DataTableProps<Row> {
  /** Names the table for screen readers (not shown). */
  caption: string;
  columns: DataTableColumn<Row>[];
  rows: readonly Row[];
  rowKey: (row: Row) => string;
  loading?: boolean;
  /** Translated load error (from error.code). Replaces the table. */
  error?: string;
  onRetry?: () => void;
  /** Shown when there are no rows. */
  empty: { title: string; description?: string; action?: ReactNode };
  defaultSort?: SortState;
  /**
   * Controlled sorting, for lists the server sorts and paginates: rows are shown as given
   * and clicks only call onSortChange. Without it, the rows passed in are sorted here.
   */
  sort?: SortState;
  onSortChange?: (sort: SortState) => void;
}

const LOADING_ROWS = 5;
const LOADING_CARDS = 3;

const ARIA_SORT = { asc: "ascending", desc: "descending" } as const;

/**
 * Records list: a table from the sm breakpoint, one card per row on phones.
 * Handles sorting, loading, empty and error states.
 */
export function DataTable<Row>({
  caption,
  columns,
  rows,
  rowKey,
  loading,
  error,
  onRetry,
  empty,
  defaultSort,
  sort: controlledSort,
  onSortChange,
}: DataTableProps<Row>) {
  const { t } = useTranslation();
  const language = useLanguage();
  const [localSort, setLocalSort] = useState<SortState | undefined>(defaultSort);
  const sort = controlledSort ?? localSort;
  const isControlled = onSortChange !== undefined;

  const sortedRows = useMemo(() => {
    const column = columns.find((candidate) => candidate.id === sort?.columnId);
    if (isControlled || !sort || !column?.sortValue) return rows;
    const value = column.sortValue;
    const collator = new Intl.Collator(language, { numeric: true, sensitivity: "base" });
    const factor = sort.direction === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      const x = value(a);
      const y = value(b);
      const order =
        typeof x === "number" && typeof y === "number"
          ? x - y
          : collator.compare(String(x), String(y));
      return order * factor;
    });
  }, [columns, rows, sort, isControlled, language]);

  function toggleSort(columnId: string) {
    const next: SortState =
      sort?.columnId === columnId && sort.direction === "asc"
        ? { columnId, direction: "desc" }
        : { columnId, direction: "asc" };
    if (isControlled) onSortChange(next);
    else setLocalSort(next);
  }

  if (error && !loading) {
    return (
      <EmptyState
        tone="danger"
        icon={CircleAlert}
        title={error}
        action={
          onRetry && (
            <Button size="sm" onClick={onRetry}>
              {t("ui.retry")}
            </Button>
          )
        }
      />
    );
  }

  if (!loading && rows.length === 0) {
    return <EmptyState title={empty.title} description={empty.description} action={empty.action} />;
  }

  const titleColumns = columns.filter((column) => column.mobile === "title");
  const lineColumns = columns.filter((column) => column.mobile === undefined);

  return (
    <div aria-busy={loading || undefined}>
      <div className="hidden sm:block">
        <Table>
          <TableCaption className="sr-only">{caption}</TableCaption>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {columns.map((column) => {
                const active = sort?.columnId === column.id ? sort.direction : undefined;
                const SortIcon =
                  active === "asc" ? ArrowUp : active === "desc" ? ArrowDown : ArrowUpDown;
                return (
                  <TableHead
                    key={column.id}
                    numeric={column.numeric}
                    aria-sort={column.sortValue && active ? ARIA_SORT[active] : undefined}
                  >
                    {column.sortValue ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(column.id)}
                        className={cn(
                          "-mx-2 inline-flex h-8 items-center gap-1 rounded-md px-2 hover:bg-surface hover:text-foreground",
                          active && "text-foreground",
                        )}
                      >
                        {column.header}
                        <SortIcon
                          className={cn("size-3.5", !active && "opacity-60")}
                          aria-hidden="true"
                        />
                      </button>
                    ) : (
                      column.header
                    )}
                  </TableHead>
                );
              })}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading
              ? Array.from({ length: LOADING_ROWS }, (_, index) => (
                  <TableRow key={index} className="hover:bg-transparent">
                    {columns.map((column) => (
                      <TableCell key={column.id} numeric={column.numeric}>
                        <Skeleton
                          className={cn("h-4 w-full max-w-32", column.numeric && "ml-auto")}
                        />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              : sortedRows.map((row) => (
                  <TableRow key={rowKey(row)}>
                    {columns.map((column) => (
                      <TableCell key={column.id} numeric={column.numeric}>
                        {column.cell(row)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
          </TableBody>
        </Table>
      </div>

      <ul aria-label={caption} className="flex flex-col gap-2 sm:hidden">
        {loading
          ? Array.from({ length: LOADING_CARDS }, (_, index) => (
              <li key={index} className="flex flex-col gap-2 rounded-lg border border-border p-4">
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-2/3" />
              </li>
            ))
          : sortedRows.map((row) => (
              <li key={rowKey(row)} className="rounded-lg border border-border bg-surface p-4">
                {titleColumns.length > 0 && (
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-sm font-medium">
                    {titleColumns.map((column) => (
                      <div key={column.id}>{column.cell(row)}</div>
                    ))}
                  </div>
                )}
                <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
                  {lineColumns.map((column) => (
                    <Fragment key={column.id}>
                      <dt className="text-muted">{column.header}</dt>
                      <dd className="min-w-0 text-right">{column.cell(row)}</dd>
                    </Fragment>
                  ))}
                </dl>
              </li>
            ))}
      </ul>
    </div>
  );
}
