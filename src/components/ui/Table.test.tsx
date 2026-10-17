import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./Table";

describe("Table", () => {
  it("right-aligns numeric columns with tabular figures", () => {
    render(
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Client</TableHead>
            <TableHead numeric>Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>Neema Mwakyusa</TableCell>
            <TableCell numeric>TSh 450,000</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    );

    expect(screen.getByRole("columnheader", { name: "Amount" })).toHaveClass("text-right");
    expect(screen.getByRole("columnheader", { name: "Client" })).toHaveAttribute("scope", "col");
    expect(screen.getByRole("cell", { name: "TSh 450,000" })).toHaveClass("text-right", "tabular");
  });
});
