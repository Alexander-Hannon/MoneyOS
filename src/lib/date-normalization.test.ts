import { describe, expect, it } from "vitest";
import {
  normalizeBillDates,
  normalizeCalendarDate,
  normalizeIncomeDates,
} from "@/lib/date-normalization";

describe("normalizeCalendarDate", () => {
  it("extracts YYYY-MM-DD from ISO strings", () => {
    expect(normalizeCalendarDate("2026-07-19T00:00:00.000Z")).toBe("2026-07-19");
  });

  it("returns undefined for invalid values", () => {
    expect(normalizeCalendarDate("")).toBeUndefined();
    expect(normalizeCalendarDate("not-a-date")).toBeUndefined();
  });
});

describe("normalizeBillDates", () => {
  it("normalizes due and paid dates", () => {
    const bill = normalizeBillDates({
      id: "b1",
      name: "Rent",
      amount: 1000,
      amountType: "fixed",
      dueDate: "2026-07-19T12:00:00.000Z",
      frequency: "monthly",
      autopay: false,
      paidFrom: "Checking",
      status: "unpaid",
      lastPaidAt: "2026-06-19T00:00:00.000Z",
    });
    expect(bill.dueDate).toBe("2026-07-19");
    expect(bill.lastPaidAt).toBe("2026-06-19");
  });
});

describe("normalizeIncomeDates", () => {
  it("normalizes income schedule dates", () => {
    const source = normalizeIncomeDates({
      id: "i1",
      source: "Pay",
      expectedAmount: 500,
      amountType: "fixed",
      frequency: "monthly",
      reliability: "high",
      active: true,
      nextDate: "2026-07-25T00:00:00.000Z",
      lastReceivedAt: "2026-06-25T00:00:00.000Z",
    });
    expect(source.nextDate).toBe("2026-07-25");
    expect(source.lastReceivedAt).toBe("2026-06-25");
  });
});
