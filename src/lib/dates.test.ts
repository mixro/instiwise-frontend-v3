import { describe, expect, it } from "vitest";
import { addDays, localDate, paymentDateRange } from "./dates";

describe("dates", () => {
  it("uses Dar es Salaam's calendar day", () => {
    // 22:30 UTC on 31 Oct is 01:30 on 1 Nov in Dar es Salaam (UTC+3).
    expect(localDate(new Date("2026-10-31T22:30:00Z"))).toBe("2026-11-01");
  });

  it("adds and subtracts days across months and years", () => {
    expect(addDays("2026-10-17", -30)).toBe("2026-09-17");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("allows payments from 30 days ago up to today", () => {
    expect(paymentDateRange(new Date("2026-10-17T09:00:00Z"))).toEqual({
      min: "2026-09-17",
      max: "2026-10-17",
    });
  });
});
