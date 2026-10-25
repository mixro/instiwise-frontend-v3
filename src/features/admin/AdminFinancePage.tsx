import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { MoneyCell } from "@/components/MoneyCell";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { FinanceAnalytics } from "@/features/analytics/FinanceAnalytics";
import { AdminExpenses } from "@/features/expenses/AdminExpenses";
import type { StaffPayment } from "@/features/operator/api";
import { StatTile } from "@/features/operator/StatTile";
import { EntryStatus } from "@/features/receipts/EntryStatus";
import { useErrorText } from "@/hooks/useErrorText";
import { useLanguage } from "@/hooks/useLanguage";
import { useToast } from "@/hooks/useToast";
import { formatDate, formatTzs } from "@/lib/format";
import { AdjustDialog } from "./AdjustDialog";
import { adminApi } from "./api";
import { PaymentHistorySheet } from "./PaymentHistorySheet";
import { useAdminFinance, useRefreshAll } from "./queries";

const TABS = ["payments", "expenses", "analytics"] as const;

/**
 * Finance, in three tabs. Payments: every payment and correction in the system.
 * Expenses: entry, approval and corrections (decided 2026-10-25). Analytics:
 * the whole company's collected, expenses and profit for a period. Nothing is
 * edited or deleted: reversing or adjusting adds a correction row and marks the
 * original. The tab is in the URL (?tab=expenses) so it can be linked to.
 */
export function AdminFinancePage() {
  const { t } = useTranslation();
  const language = useLanguage();
  const { apiError } = useErrorText();
  const { toast } = useToast();
  const refresh = useRefreshAll();
  const finance = useAdminFinance();
  const [params, setParams] = useSearchParams();
  const tab = TABS.find((name) => name === params.get("tab")) ?? "payments";
  const [reversing, setReversing] = useState<StaffPayment | null>(null);
  const [adjusting, setAdjusting] = useState<StaffPayment | null>(null);
  const [history, setHistory] = useState<StaffPayment | null>(null);
  const [reverseError, setReverseError] = useState<string>();
  const entries = finance.data?.entries ?? [];

  const originalOf = (entry: StaffPayment) =>
    entry.kind === "PAYMENT" ? entry : entries.find((e) => e.receiptNumber === entry.corrects);

  async function reverse(payment: StaffPayment, reason?: string) {
    setReverseError(undefined);
    try {
      const row = await adminApi.reverse(payment.id, reason ?? "");
      toast({
        variant: "success",
        title: t("finance.reverseDone", {
          number: payment.receiptNumber,
          correction: row.receiptNumber,
        }),
      });
      void refresh();
    } catch (failure) {
      setReverseError(apiError(failure));
      throw failure;
    }
  }

  const columns: DataTableColumn<StaffPayment>[] = [
    {
      id: "number",
      header: t("finance.number"),
      cell: (entry) => (
        <button
          type="button"
          onClick={() => setHistory(originalOf(entry) ?? null)}
          className="inline-flex min-h-11 items-center font-medium whitespace-nowrap text-brand-text underline underline-offset-4 hover:no-underline sm:min-h-0"
        >
          {entry.receiptNumber}
          <span className="sr-only"> {t("finance.showHistory")}</span>
        </button>
      ),
      sortValue: (entry) => entry.receiptNumber,
      mobile: "title",
    },
    {
      id: "status",
      header: t("client.payments.status"),
      cell: (entry) => <EntryStatus entry={entry} />,
    },
    {
      id: "amount",
      header: t("client.payments.amount"),
      cell: (entry) => <MoneyCell amount={entry.amount} />,
      sortValue: (entry) => entry.amount,
      numeric: true,
    },
    {
      id: "date",
      header: t("finance.date"),
      cell: (entry) => (
        <span className="whitespace-nowrap">{formatDate(entry.receivedAt, language)}</span>
      ),
      sortValue: (entry) => entry.receivedAt,
    },
    {
      id: "client",
      header: t("operator.payments.client"),
      cell: (entry) => entry.clientName,
      sortValue: (entry) => entry.clientName,
    },
    {
      id: "project",
      header: t("client.payments.project"),
      cell: (entry) => entry.projectTitle,
    },
    {
      id: "by",
      header: t("finance.by"),
      cell: (entry) => entry.recordedBy,
      sortValue: (entry) => entry.recordedBy,
    },
    {
      id: "actions",
      header: t("admin.actions"),
      cell: (entry) =>
        entry.kind === "PAYMENT" && entry.status !== "REVERSED" ? (
          <span className="inline-flex flex-wrap gap-2">
            <Button size="sm" onClick={() => setAdjusting(entry)}>
              {t("finance.adjust")}
              <span className="sr-only"> {entry.receiptNumber}</span>
            </Button>
            <Button size="sm" onClick={() => setReversing(entry)}>
              {t("finance.reverse")}
              <span className="sr-only"> {entry.receiptNumber}</span>
            </Button>
          </span>
        ) : (
          "—"
        ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title={t("nav.admin.finance")} description={t("finance.subtitle")} />
      <Tabs
        value={tab}
        onValueChange={(next) =>
          setParams(next === "payments" ? {} : { tab: next }, { replace: true })
        }
      >
        <TabsList aria-label={t("nav.admin.finance")}>
          <TabsTrigger value="payments">{t("expenses.tabs.payments")}</TabsTrigger>
          <TabsTrigger value="expenses">{t("expenses.tabs.expenses")}</TabsTrigger>
          <TabsTrigger value="analytics">{t("analytics.tabs.analytics")}</TabsTrigger>
        </TabsList>
        <TabsContent value="analytics" className="pt-4">
          <FinanceAnalytics role="ADMIN" />
        </TabsContent>
        <TabsContent value="expenses" className="pt-4">
          <AdminExpenses />
        </TabsContent>
        <TabsContent value="payments" className="space-y-6 pt-4">
          {finance.isPending && (
            <div aria-busy="true" className="grid gap-4 sm:grid-cols-3">
              <Skeleton className="h-28 w-full rounded-lg" />
              <Skeleton className="h-28 w-full rounded-lg" />
              <Skeleton className="h-28 w-full rounded-lg" />
            </div>
          )}
          {finance.data && (
            <dl className="grid gap-4 sm:grid-cols-3">
              <StatTile
                label={t("client.money.outstanding")}
                value={formatTzs(finance.data.totals.balance, language)}
                rule={t("admin.overview.allTimeRule")}
              />
              <StatTile
                label={t("operator.dashboard.collected")}
                value={formatTzs(finance.data.totals.paidAmount, language)}
                rule={t("admin.overview.collectedRule")}
              />
              <StatTile
                label={t("client.money.agreed")}
                value={formatTzs(finance.data.totals.agreedAmount, language)}
                rule={t("admin.overview.allTimeRule")}
              />
            </dl>
          )}

          <section aria-labelledby="finance-ledger" className="space-y-3">
            <h2 id="finance-ledger" className="text-base font-semibold">
              {t("finance.ledger")}
            </h2>
            <p className="text-sm text-muted">{t("finance.neverDeleted")}</p>
            <DataTable
              caption={t("finance.ledger")}
              columns={columns}
              rows={entries}
              rowKey={(entry) => entry.id}
              loading={finance.isPending}
              error={finance.isError ? apiError(finance.error) : undefined}
              onRetry={() => void finance.refetch()}
              defaultSort={{ columnId: "date", direction: "desc" }}
              empty={{ title: t("client.payments.empty"), description: t("finance.emptyBody") }}
            />
          </section>

          {reversing && (
            <ConfirmDialog
              open
              onOpenChange={(open) => {
                if (!open) {
                  setReversing(null);
                  setReverseError(undefined);
                }
              }}
              tone="danger"
              title={t("finance.reverseTitle", { number: reversing.receiptNumber })}
              description={t("finance.reverseBody", { number: reversing.receiptNumber })}
              confirmLabel={t("finance.reverse")}
              reason={{ label: t("finance.reasonLabel"), hint: t("changes.admin.reasonHint") }}
              error={reverseError}
              onConfirm={(reason) => reverse(reversing, reason)}
            />
          )}
          {adjusting && (
            <AdjustDialog
              reference={adjusting.receiptNumber}
              amount={adjusting.amount}
              onAdjust={async (amount, reason) =>
                (await adminApi.adjust(adjusting.id, amount, reason)).receiptNumber
              }
              onClose={() => setAdjusting(null)}
            />
          )}
          <PaymentHistorySheet
            original={history}
            entries={entries}
            onClose={() => setHistory(null)}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
