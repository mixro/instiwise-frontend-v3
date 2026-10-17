import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DataTable, type DataTableColumn } from "./DataTable";

interface Payment {
  receipt: string;
  client: string;
  amount: number;
}

const ROWS: Payment[] = [
  { receipt: "RC-2", client: "Baraka Mushi", amount: 1_250_000 },
  { receipt: "RC-1", client: "Neema Mwakyusa", amount: 300_000 },
  { receipt: "RC-3", client: "Asha Juma", amount: 85_000 },
];

const COLUMNS: DataTableColumn<Payment>[] = [
  { id: "receipt", header: "Receipt", cell: (row) => row.receipt, mobile: "title" },
  {
    id: "client",
    header: "Client",
    cell: (row) => row.client,
    sortValue: (row) => row.client,
  },
  {
    id: "amount",
    header: "Amount",
    cell: (row) => String(row.amount),
    sortValue: (row) => row.amount,
    numeric: true,
  },
];

const EMPTY = { title: "No payments recorded yet" };

function renderTable(props: Partial<Parameters<typeof DataTable<Payment>>[0]> = {}) {
  return render(
    <DataTable
      caption="Payment records"
      columns={COLUMNS}
      rows={ROWS}
      rowKey={(row) => row.receipt}
      empty={EMPTY}
      {...props}
    />,
  );
}

function clientColumn(): string[] {
  const table = screen.getByRole("table", { name: "Payment records" });
  return within(table)
    .getAllByRole("row")
    .slice(1)
    .map((row) => within(row).getAllByRole("cell")[1]?.textContent ?? "");
}

describe("DataTable", () => {
  it("renders the rows as a captioned table", () => {
    renderTable();
    const table = screen.getByRole("table", { name: "Payment records" });
    expect(within(table).getAllByRole("row")).toHaveLength(ROWS.length + 1);
    expect(within(table).getByRole("columnheader", { name: "Amount" })).toHaveClass("text-right");
  });

  it("sorts by a column, toggling ascending and descending", async () => {
    renderTable();
    const header = () => screen.getByRole("columnheader", { name: "Client" });

    await userEvent.click(within(header()).getByRole("button", { name: "Client" }));
    expect(header()).toHaveAttribute("aria-sort", "ascending");
    expect(clientColumn()).toEqual(["Asha Juma", "Baraka Mushi", "Neema Mwakyusa"]);

    await userEvent.click(within(header()).getByRole("button", { name: "Client" }));
    expect(header()).toHaveAttribute("aria-sort", "descending");
    expect(clientColumn()).toEqual(["Neema Mwakyusa", "Baraka Mushi", "Asha Juma"]);
  });

  it("sorts numbers numerically and honours the default sort", () => {
    renderTable({ defaultSort: { columnId: "amount", direction: "asc" } });
    expect(screen.getByRole("columnheader", { name: "Amount" })).toHaveAttribute(
      "aria-sort",
      "ascending",
    );
    expect(clientColumn()).toEqual(["Asha Juma", "Neema Mwakyusa", "Baraka Mushi"]);
  });

  it("leaves server-sorted rows alone and reports the requested sort", async () => {
    const onSortChange = vi.fn();
    renderTable({ sort: { columnId: "client", direction: "asc" }, onSortChange });

    expect(clientColumn()).toEqual(["Baraka Mushi", "Neema Mwakyusa", "Asha Juma"]);
    await userEvent.click(screen.getByRole("button", { name: "Client" }));
    expect(onSortChange).toHaveBeenCalledWith({ columnId: "client", direction: "desc" });
  });

  it("shows the empty state when there are no rows", () => {
    renderTable({ rows: [] });
    expect(screen.getByText("No payments recorded yet")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("shows skeleton rows while loading", () => {
    const { container } = renderTable({ loading: true });
    expect(container.firstElementChild).toHaveAttribute("aria-busy", "true");
    expect(screen.queryByText("Baraka Mushi")).not.toBeInTheDocument();
  });

  it("shows the error with a working retry button", async () => {
    const onRetry = vi.fn();
    renderTable({ error: "Payments could not be loaded.", onRetry });

    expect(screen.getByText("Payments could not be loaded.")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("renders one labelled card per row for phones", () => {
    renderTable();
    const cards = within(screen.getByRole("list", { name: "Payment records" })).getAllByRole(
      "listitem",
    );
    expect(cards).toHaveLength(ROWS.length);

    const first = cards[0] as HTMLElement;
    expect(first).toHaveTextContent("RC-2");
    expect(within(first).getByText("Client").tagName).toBe("DT");
    expect(within(first).getByText("Baraka Mushi").tagName).toBe("DD");
    expect(within(first).queryByText("Receipt")).not.toBeInTheDocument();
  });
});
