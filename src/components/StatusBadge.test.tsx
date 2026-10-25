import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import i18n from "@/i18n";
import {
  AGREEMENT_STATUS_TONES,
  AGREEMENT_STATUSES,
  CHANGE_REQUEST_STATUS_TONES,
  CHANGE_REQUEST_STATUSES,
  CORRECTION_KIND_TONES,
  CORRECTION_KINDS,
  EXPENSE_STATUS_TONES,
  EXPENSE_STATUSES,
  OPERATOR_STATUS_TONES,
  OPERATOR_STATUSES,
  INVITATION_STATUS_TONES,
  INVITATION_STATUSES,
  PAYMENT_STATUS_TONES,
  PAYMENT_STATUSES,
  PROJECT_STATUS_TONES,
  PROJECT_STATUSES,
} from "@/lib/status";
import { StatusBadge } from "./StatusBadge";

describe("StatusBadge", () => {
  it("shows the status as words, with the tone as a data attribute", () => {
    render(<StatusBadge kind="project" status="AWAITING_CLIENT_ACCEPTANCE" />);
    const badge = screen.getByText("Awaiting client acceptance");
    expect(badge).toHaveAttribute("data-tone", "warning");
  });

  it("translates the label to Swahili", async () => {
    await i18n.changeLanguage("sw");
    render(<StatusBadge kind="payment" status="REVERSED" />);
    expect(screen.getByText("Imebatilishwa")).toHaveAttribute("data-tone", "danger");
  });

  it.each([
    ["project", PROJECT_STATUSES, PROJECT_STATUS_TONES],
    ["payment", PAYMENT_STATUSES, PAYMENT_STATUS_TONES],
    ["invitation", INVITATION_STATUSES, INVITATION_STATUS_TONES],
    ["agreement", AGREEMENT_STATUSES, AGREEMENT_STATUS_TONES],
    ["changeRequest", CHANGE_REQUEST_STATUSES, CHANGE_REQUEST_STATUS_TONES],
    ["correction", CORRECTION_KINDS, CORRECTION_KIND_TONES],
    ["operator", OPERATOR_STATUSES, OPERATOR_STATUS_TONES],
    ["expense", EXPENSE_STATUSES, EXPENSE_STATUS_TONES],
  ] as const)("has a label and a tone for every %s status", (kind, statuses, tones) => {
    for (const language of ["en", "sw"]) {
      for (const status of statuses) {
        const key = `status.${kind}.${status}`;
        expect(i18n.exists(key, { lng: language }), `${language}: ${key}`).toBe(true);
        expect(tones[status as keyof typeof tones]).toBeDefined();
      }
    }
  });

  it("never tells two statuses of one kind apart by colour alone", () => {
    for (const language of ["en", "sw"]) {
      for (const [kind, statuses] of [
        ["project", PROJECT_STATUSES],
        ["payment", PAYMENT_STATUSES],
        ["invitation", INVITATION_STATUSES],
        ["agreement", AGREEMENT_STATUSES],
        ["changeRequest", CHANGE_REQUEST_STATUSES],
        ["correction", CORRECTION_KINDS],
        ["operator", OPERATOR_STATUSES],
        ["expense", EXPENSE_STATUSES],
      ] as const) {
        const labels = statuses.map((status) =>
          i18n.t(`status.${kind}.${status}` as "status.project.DRAFT", { lng: language }),
        );
        expect(new Set(labels).size, `${language} ${kind}`).toBe(statuses.length);
      }
    }
  });
});
