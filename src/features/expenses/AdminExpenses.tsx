import { Plus } from "lucide-react";
import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useSearchParams } from "react-router-dom";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { AdjustDialog } from "@/features/admin/AdjustDialog";
import { useErrorText } from "@/hooks/useErrorText";
import { useLanguage } from "@/hooks/useLanguage";
import { useToast } from "@/hooks/useToast";
import { formatTzs } from "@/lib/format";
import { EXPENSE_STATUSES, type ExpenseStatus } from "@/lib/status";
import { expensesApi, type AdminExpenseFilters, type Expense, type ExpenseKind } from "./api";
import { ExpenseHistorySheet } from "./ExpenseHistorySheet";
import { ExpensesTable } from "./ExpensesTable";
import {
  useExpenseCategories,
  useExpenseProjects,
  useExpenses,
  useRefreshExpenses,
} from "./queries";
import { EXPENSE_KINDS } from "./schema";

const ALL = "all";

type Decision = { action: "approve" | "reject" | "reverse"; expense: Expense } | null;

/**
 * Every expense row, filtered on the server. PENDING ones are approved or
 * rejected; approved ones are corrected with new rows, never edited or deleted.
 */
export function AdminExpenses() {
  const { t } = useTranslation();
  const language = useLanguage();
  const { apiError } = useErrorText();
  const { toast } = useToast();
  const refresh = useRefreshExpenses();
  const [params] = useSearchParams();
  const initialStatus = params.get("status");
  const [filters, setFilters] = useState<AdminExpenseFilters>(
    EXPENSE_STATUSES.includes(initialStatus as ExpenseStatus)
      ? { status: initialStatus as ExpenseStatus }
      : {},
  );
  const list = useExpenses("ADMIN", filters);
  const categories = useExpenseCategories("ADMIN");
  const projects = useExpenseProjects("ADMIN");
  const rows = list.data?.pages.flatMap((page) => page.items) ?? [];
  const summary = list.data?.pages[0];
  const [decision, setDecision] = useState<Decision>(null);
  const [decisionError, setDecisionError] = useState<string>();
  const [adjusting, setAdjusting] = useState<Expense | null>(null);
  const [history, setHistory] = useState<Expense | null>(null);
  const ids = {
    status: useId(),
    kind: useId(),
    category: useId(),
    project: useId(),
    from: useId(),
    to: useId(),
  };
  const filtered = Object.values(filters).some(Boolean);

  const setFilter = <K extends keyof AdminExpenseFilters>(key: K, value: AdminExpenseFilters[K]) =>
    setFilters((current) => ({ ...current, [key]: value || undefined }));

  /** Opens the history of the expense a row belongs to (a correction opens its original). */
  function showHistory(expense: Expense) {
    setHistory(
      expense.rowType === "EXPENSE"
        ? expense
        : (rows.find((row) => row.reference === expense.corrects) ?? expense),
    );
  }

  async function decide(reason?: string) {
    if (!decision) return;
    const { action, expense } = decision;
    setDecisionError(undefined);
    try {
      if (action === "approve") {
        await expensesApi.admin.approve(expense.id);
        toast({
          variant: "success",
          title: t("expenses.approved", { reference: expense.reference }),
        });
      } else if (action === "reject") {
        await expensesApi.admin.reject(expense.id, reason ?? "");
        toast({
          variant: "success",
          title: t("expenses.rejected", { reference: expense.reference }),
        });
      } else {
        const row = await expensesApi.admin.reverse(expense.id, reason ?? "");
        toast({
          variant: "success",
          title: t("expenses.reversed", {
            reference: expense.reference,
            correction: row.reference,
          }),
        });
      }
      await refresh();
    } catch (failure) {
      setDecisionError(apiError(failure));
      throw failure;
    }
  }

  function actions(expense: Expense) {
    if (expense.rowType !== "EXPENSE") return null;
    const label = <span className="sr-only"> {expense.reference}</span>;
    if (expense.status === "PENDING") {
      return (
        <span className="inline-flex gap-2">
          <Button
            size="sm"
            variant="primary"
            onClick={() => setDecision({ action: "approve", expense })}
          >
            {t("expenses.approve")}
            {label}
          </Button>
          <Button size="sm" onClick={() => setDecision({ action: "reject", expense })}>
            {t("expenses.reject")}
            {label}
          </Button>
        </span>
      );
    }
    if (expense.status === "APPROVED" || expense.status === "ADJUSTED") {
      return (
        <span className="inline-flex gap-2">
          <Button size="sm" onClick={() => setAdjusting(expense)}>
            {t("finance.adjust")}
            {label}
          </Button>
          <Button size="sm" onClick={() => setDecision({ action: "reverse", expense })}>
            {t("finance.reverse")}
            {label}
          </Button>
        </span>
      );
    }
    return null;
  }

  const current = decision?.expense;

  return (
    <section aria-labelledby="expenses-heading" className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 id="expenses-heading" className="text-base font-semibold">
            {t("expenses.tabs.expenses")}
          </h2>
          <p className="text-sm text-muted">{t("expenses.adminIntro")}</p>
          {summary && (
            <p className="text-sm font-medium" aria-live="polite">
              {summary.awaitingApproval.count > 0
                ? t("expenses.waiting", {
                    count: summary.awaitingApproval.count,
                    amount: formatTzs(summary.awaitingApproval.amount, language),
                  })
                : t("expenses.noneWaiting")}
            </p>
          )}
        </div>
        <Button asChild variant="primary">
          <Link to="/admin/finance/expenses/new">
            <Plus className="size-4" aria-hidden="true" />
            {t("expenses.add")}
          </Link>
        </Button>
      </div>

      <div
        role="group"
        aria-label={t("expenses.filters.title")}
        className="grid gap-4 rounded-lg border border-border bg-surface p-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        <div className="flex flex-col gap-2">
          <Label htmlFor={ids.status}>{t("expenses.filters.status")}</Label>
          <Select
            value={filters.status ?? ALL}
            onValueChange={(value) =>
              setFilter("status", value === ALL ? undefined : (value as ExpenseStatus))
            }
          >
            <SelectTrigger id={ids.status}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t("expenses.filters.allStatuses")}</SelectItem>
              {EXPENSE_STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {t(`status.expense.${status}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor={ids.kind}>{t("expenses.filters.kind")}</Label>
          <Select
            value={filters.kind ?? ALL}
            onValueChange={(value) =>
              setFilter("kind", value === ALL ? undefined : (value as ExpenseKind))
            }
          >
            <SelectTrigger id={ids.kind}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t("expenses.filters.allKinds")}</SelectItem>
              {EXPENSE_KINDS.map((kind) => (
                <SelectItem key={kind} value={kind}>
                  {t(`expenses.kind.${kind}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor={ids.category}>{t("expenses.filters.category")}</Label>
          <Select
            value={filters.categoryId ?? ALL}
            onValueChange={(value) => setFilter("categoryId", value === ALL ? undefined : value)}
          >
            <SelectTrigger id={ids.category}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t("expenses.filters.allCategories")}</SelectItem>
              {(categories.data ?? []).map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor={ids.project}>{t("expenses.filters.project")}</Label>
          <Select
            value={filters.projectId ?? ALL}
            onValueChange={(value) => setFilter("projectId", value === ALL ? undefined : value)}
          >
            <SelectTrigger id={ids.project}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t("expenses.filters.allProjects")}</SelectItem>
              {(projects.data ?? []).map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor={ids.from}>{t("expenses.filters.from")}</Label>
          <Input
            id={ids.from}
            type="date"
            value={filters.from ?? ""}
            onChange={(event) => setFilter("from", event.target.value)}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor={ids.to}>{t("expenses.filters.to")}</Label>
          <Input
            id={ids.to}
            type="date"
            value={filters.to ?? ""}
            onChange={(event) => setFilter("to", event.target.value)}
          />
        </div>
        {filtered && (
          <div className="sm:col-span-2 lg:col-span-3">
            <Button size="sm" onClick={() => setFilters({})}>
              {t("expenses.filters.clear")}
            </Button>
          </div>
        )}
      </div>

      <ExpensesTable
        caption={t("expenses.tabs.expenses")}
        rows={rows}
        loading={list.isPending}
        error={list.isError ? apiError(list.error) : undefined}
        onRetry={() => void list.refetch()}
        empty={
          filtered
            ? { title: t("expenses.empty.noMatches") }
            : { title: t("expenses.empty.all"), description: t("expenses.empty.allBody") }
        }
        showEnteredBy
        onShowHistory={showHistory}
        actions={actions}
        hasMore={list.hasNextPage}
        loadingMore={list.isFetchingNextPage}
        onShowMore={() => void list.fetchNextPage()}
      />

      {current && decision && (
        <ConfirmDialog
          open
          onOpenChange={(open) => {
            if (!open) {
              setDecision(null);
              setDecisionError(undefined);
            }
          }}
          tone={decision.action === "approve" ? "default" : "danger"}
          title={
            decision.action === "approve"
              ? t("expenses.approveTitle", { reference: current.reference })
              : decision.action === "reject"
                ? t("expenses.rejectTitle", { reference: current.reference })
                : t("finance.reverseTitle", { number: current.reference })
          }
          description={
            decision.action === "approve"
              ? t("expenses.approveBody", {
                  amount: formatTzs(current.amount, language),
                  description: current.description,
                  name: current.enteredBy.name,
                })
              : decision.action === "reject"
                ? t("expenses.rejectBody")
                : t("expenses.reverseBody", { reference: current.reference })
          }
          confirmLabel={
            decision.action === "approve"
              ? t("expenses.approve")
              : decision.action === "reject"
                ? t("expenses.reject")
                : t("finance.reverse")
          }
          reason={
            decision.action === "approve"
              ? undefined
              : {
                  label:
                    decision.action === "reject"
                      ? t("expenses.rejectReason")
                      : t("finance.reasonLabel"),
                  hint: t("changes.admin.reasonHint"),
                }
          }
          error={decisionError}
          onConfirm={decide}
        />
      )}
      {adjusting && (
        <AdjustDialog
          reference={adjusting.reference}
          amount={adjusting.amount}
          directionLabel={t("expenses.adjustDirection")}
          onAdjust={async (amount, reason) =>
            (await expensesApi.admin.adjust(adjusting.id, amount, reason)).reference
          }
          onClose={() => {
            setAdjusting(null);
            void refresh();
          }}
        />
      )}
      <ExpenseHistorySheet original={history} rows={rows} onClose={() => setHistory(null)} />
    </section>
  );
}
