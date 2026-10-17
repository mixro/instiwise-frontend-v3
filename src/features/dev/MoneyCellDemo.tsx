import { useTranslation } from "react-i18next";
import { MoneyCell } from "@/components/MoneyCell";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import { DemoSection } from "./DemoSection";
import { StateCell } from "./StateCell";

// Values as the server would send them; nothing here is added up in the browser.
const ENTRIES = [
  { key: "agreed", amount: 1_200_000 },
  { key: "payment", amount: 450_000 },
  { key: "reversal", amount: -85_000 },
  { key: "zero", amount: 0 },
] as const;

export function MoneyCellDemo() {
  const { t } = useTranslation();

  return (
    <DemoSection id="moneyCell" title={t("dev.sections.moneyCell")}>
      <StateCell label={t("dev.states.default")}>
        <Table>
          <TableCaption className="sr-only">{t("dev.sections.moneyCell")}</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>{t("dev.money.entry")}</TableHead>
              <TableHead numeric>{t("dev.table.amount")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ENTRIES.map(({ key, amount }) => (
              <TableRow key={key}>
                <TableCell>{t(`dev.money.${key}`)}</TableCell>
                <TableCell>
                  <MoneyCell amount={amount} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </StateCell>
    </DemoSection>
  );
}
