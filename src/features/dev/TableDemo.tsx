import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
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
import { currentLanguage } from "@/i18n";
import { formatDate, formatTzs } from "@/lib/format";
import { DemoSection } from "./DemoSection";
import { StateCell } from "./StateCell";
import { SAMPLE_PAYMENTS } from "./sample-data";

const COLUMNS = 5;

function PaymentsTable({ busy, children }: { busy?: boolean; children: ReactNode }) {
  const { t } = useTranslation();
  return (
    <Table aria-busy={busy || undefined}>
      <TableCaption>{t("dev.table.caption")}</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>{t("dev.table.receipt")}</TableHead>
          <TableHead>{t("dev.table.date")}</TableHead>
          <TableHead>{t("dev.table.client")}</TableHead>
          <TableHead>{t("dev.table.method")}</TableHead>
          <TableHead numeric>{t("dev.table.amount")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>{children}</TableBody>
    </Table>
  );
}

/** One full-width row for the empty and error states. */
function MessageRow({ children }: { children: ReactNode }) {
  return (
    <TableRow className="hover:bg-transparent">
      <TableCell colSpan={COLUMNS} className="h-32 text-center">
        {children}
      </TableCell>
    </TableRow>
  );
}

export function TableDemo() {
  const { t } = useTranslation();
  const language = currentLanguage();

  return (
    <DemoSection id="table" title={t("dev.sections.table")}>
      <StateCell
        label={`${t("dev.states.default")} · ${t("dev.states.hover")} · ${t("dev.states.selected")}`}
        wide
      >
        <PaymentsTable>
          {SAMPLE_PAYMENTS.map((payment, index) => (
            <TableRow
              key={payment.receipt}
              data-preview={index === 1 ? "hover" : undefined}
              data-state={index === 2 ? "selected" : undefined}
            >
              <TableCell className="font-medium whitespace-nowrap">{payment.receipt}</TableCell>
              <TableCell className="whitespace-nowrap">
                {formatDate(payment.date, language)}
              </TableCell>
              <TableCell className="whitespace-nowrap">{payment.client}</TableCell>
              <TableCell className="whitespace-nowrap">
                {t(`dev.methods.${payment.method}`)}
              </TableCell>
              <TableCell numeric>{formatTzs(payment.amount, language)}</TableCell>
            </TableRow>
          ))}
        </PaymentsTable>
        <p className="text-sm text-muted">{t("dev.table.rowStates")}</p>
      </StateCell>

      <StateCell label={t("dev.states.loading")} wide>
        <PaymentsTable busy>
          {[0, 1, 2].map((row) => (
            <TableRow key={row} className="hover:bg-transparent">
              {Array.from({ length: COLUMNS }, (_, column) => (
                <TableCell key={column}>
                  <Skeleton className="h-4 w-full max-w-32" />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </PaymentsTable>
      </StateCell>

      <StateCell label={t("dev.states.empty")} wide>
        <PaymentsTable>
          <MessageRow>
            <span className="text-muted">{t("dev.table.empty")}</span>
          </MessageRow>
        </PaymentsTable>
      </StateCell>

      <StateCell label={t("dev.states.error")} wide>
        <PaymentsTable>
          <MessageRow>
            <div className="flex flex-col items-center gap-2">
              <span className="text-danger-fg">{t("dev.table.error")}</span>
              <Button size="sm">{t("dev.actions.retry")}</Button>
            </div>
          </MessageRow>
        </PaymentsTable>
      </StateCell>
    </DemoSection>
  );
}
