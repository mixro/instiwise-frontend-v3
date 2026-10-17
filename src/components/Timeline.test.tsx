import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { formatDate } from "@/lib/format";
import { Timeline, type TimelineItem } from "./Timeline";

const ITEMS: TimelineItem[] = [
  {
    id: "a",
    title: "Agreement version 2 accepted",
    date: "2026-10-14",
    meta: "Neema Mwakyusa",
  },
  {
    id: "b",
    title: "Sensors wired and tested",
    date: "2026-10-09",
    description: "The third sensor is being replaced.",
  },
];

describe("Timeline", () => {
  it("lists items in the given order with machine-readable dates", () => {
    render(<Timeline items={ITEMS} />);

    const items = within(screen.getByRole("list")).getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent("Agreement version 2 accepted");
    expect(items[0]).toHaveTextContent("Neema Mwakyusa");
    expect(items[1]).toHaveTextContent("The third sensor is being replaced.");

    const time = within(items[0] as HTMLElement).getByText(formatDate("2026-10-14", "en"));
    expect(time.tagName).toBe("TIME");
    expect(time).toHaveAttribute("datetime", "2026-10-14");
  });

  it("shows the empty state when there are no items", () => {
    render(<Timeline items={[]} empty={<p>No progress updates yet</p>} />);
    expect(screen.getByText("No progress updates yet")).toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  it("shows a busy skeleton while loading", () => {
    const { container } = render(<Timeline items={ITEMS} loading />);
    expect(container.querySelector("[aria-busy='true']")).toBeInTheDocument();
    expect(screen.queryByText("Agreement version 2 accepted")).not.toBeInTheDocument();
  });
});
