import { describe, expect, it } from "vitest";
import type { Bill, IncomeSource } from "@/types/money";
import {
  billsDueThisMonth,
  billsDueWithin,
  expectedIncomeWithin,
} from "@/lib/money-utils";
import {
  getBillEffectiveDueDate,
  getOccurrencesInRange,
  isBillOccurrencePaid,
  monthlyOccurrenceYMD,
} from "@/lib/recurrence";

const AS_OF = "2026-07-19";

function bill(overrides: Partial<Bill> & Pick<Bill, "id" | "name">): Bill {
  return {
    amount: 100,
    amountType: "fixed",
    dueDate: "2026-01-15",
    frequency: "monthly",
    autopay: false,
    paidFrom: "Checking",
    status: "unpaid",
    ...overrides,
  };
}

function income(
  overrides: Partial<IncomeSource> & Pick<IncomeSource, "id" | "source">,
): IncomeSource {
  return {
    expectedAmount: 500,
    amountType: "fixed",
    frequency: "monthly",
    reliability: "high",
    active: true,
    ...overrides,
  };
}

describe("monthlyOccurrenceYMD", () => {
  it("clamps day 31 to February in non-leap year", () => {
    expect(monthlyOccurrenceYMD("2026-01-31", 2026, 1)).toBe("2026-02-28");
  });

  it("clamps day 31 to February in leap year", () => {
    expect(monthlyOccurrenceYMD("2024-01-31", 2024, 1)).toBe("2024-02-29");
  });
});

describe("getOccurrencesInRange", () => {
  it("includes monthly occurrences across month boundaries", () => {
    const dates = getOccurrencesInRange({
      frequency: "monthly",
      anchorDate: "2026-06-05",
      rangeStart: "2026-07-01",
      rangeEnd: "2026-07-31",
    });
    expect(dates).toEqual(["2026-07-05"]);
  });

  it("rolls December monthly bill into January", () => {
    const dates = getOccurrencesInRange({
      frequency: "monthly",
      anchorDate: "2025-12-20",
      rangeStart: "2026-01-01",
      rangeEnd: "2026-01-31",
    });
    expect(dates).toEqual(["2026-01-20"]);
  });
});

describe("billsDueThisMonth", () => {
  it("includes monthly bill due later in the current month", () => {
    const bills = [
      bill({ id: "b1", name: "Rent", dueDate: "2026-01-25", amount: 1200 }),
    ];
    const result = billsDueThisMonth(bills, AS_OF);
    expect(result.count).toBe(1);
    expect(result.total).toBe(1200);
  });

  it("includes monthly bill anchored in a previous month on its day in July", () => {
    const bills = [
      bill({ id: "b1", name: "Internet", dueDate: "2026-03-10", amount: 80 }),
    ];
    const result = billsDueThisMonth(bills, AS_OF);
    expect(result.count).toBe(1);
    expect(result.total).toBe(80);
  });

  it("includes bill due on the 31st in July when anchor was January 31", () => {
    const bills = [
      bill({ id: "b1", name: "HOA", dueDate: "2026-01-31", amount: 50 }),
    ];
    const result = billsDueThisMonth(bills, AS_OF);
    expect(result.count).toBe(1);
    expect(result.total).toBe(50);
  });

  it("excludes one-time bill outside the current month", () => {
    const bills = [
      bill({
        id: "b1",
        name: "Registration",
        dueDate: "2026-08-01",
        frequency: "one-time",
        amount: 200,
      }),
    ];
    const result = billsDueThisMonth(bills, AS_OF);
    expect(result.count).toBe(0);
  });

  it("includes one-time bill in the current month", () => {
    const bills = [
      bill({
        id: "b1",
        name: "Tax",
        dueDate: "2026-07-28",
        frequency: "one-time",
        amount: 300,
      }),
    ];
    const result = billsDueThisMonth(bills, AS_OF);
    expect(result.count).toBe(1);
    expect(result.total).toBe(300);
  });

  it("excludes paid current occurrence but includes next month after roll-forward", () => {
    const julyBill = bill({
      id: "b1",
      name: "Electric",
      dueDate: "2026-01-15",
      lastPaidAt: "2026-07-15",
      status: "paid",
      amount: 90,
    });
    const july = billsDueThisMonth([julyBill], AS_OF);
    expect(july.count).toBe(0);

    const august = billsDueThisMonth([julyBill], "2026-08-10");
    expect(august.count).toBe(1);
    expect(august.total).toBe(90);
  });

  it("returns zero when no bills match", () => {
    expect(billsDueThisMonth([], AS_OF)).toEqual({ total: 0, count: 0 });
  });
});

describe("billsDueWithin", () => {
  it("includes overdue bills up to 7 days", () => {
    const bills = [
      bill({ id: "b1", name: "Water", dueDate: "2026-01-12", amount: 40 }),
    ];
    const result = billsDueWithin(bills, 14, AS_OF);
    expect(result.count).toBe(1);
  });

  it("uses effective due dates for recurring bills", () => {
    const bills = [
      bill({ id: "b1", name: "Phone", dueDate: "2026-02-22", amount: 60 }),
    ];
    const result = billsDueWithin(bills, 14, AS_OF);
    expect(result.effectiveDueDates.get("b1")).toBe("2026-07-22");
  });
});

describe("isBillOccurrencePaid", () => {
  it("treats one-time paid bill as fully paid", () => {
    const b = bill({
      id: "b1",
      name: "Fee",
      frequency: "one-time",
      dueDate: "2026-07-10",
      status: "paid",
    });
    expect(isBillOccurrencePaid(b, "2026-07-10")).toBe(true);
  });

  it("allows future monthly occurrence after paid current period", () => {
    const b = bill({
      id: "b1",
      name: "Rent",
      dueDate: "2026-01-05",
      status: "paid",
      lastPaidAt: "2026-07-05",
    });
    expect(isBillOccurrencePaid(b, "2026-07-05")).toBe(true);
    expect(isBillOccurrencePaid(b, "2026-08-05")).toBe(false);
  });
});

describe("expectedIncomeWithin", () => {
  it("includes recurring income within 14 days (inclusive window)", () => {
    const sources = [
      income({
        id: "i1",
        source: "Paycheck",
        frequency: "monthly",
        nextDate: "2026-07-25",
        expectedAmount: 2000,
      }),
    ];
    const result = expectedIncomeWithin(sources, 14, AS_OF);
    expect(result.count).toBe(1);
    expect(result.total).toBe(2000);
  });

  it("excludes recurring income outside 14 days", () => {
    const sources = [
      income({
        id: "i1",
        source: "Paycheck",
        frequency: "monthly",
        nextDate: "2026-08-05",
        expectedAmount: 2000,
      }),
    ];
    const result = expectedIncomeWithin(sources, 14, AS_OF);
    expect(result.count).toBe(0);
  });

  it("includes income scheduled today", () => {
    const sources = [
      income({
        id: "i1",
        source: "Side gig",
        frequency: "monthly",
        nextDate: AS_OF,
        expectedAmount: 400,
      }),
    ];
    const result = expectedIncomeWithin(sources, 14, AS_OF);
    expect(result.count).toBe(1);
  });

  it("includes income scheduled exactly 14 days from today", () => {
    const sources = [
      income({
        id: "i1",
        source: "Bonus",
        frequency: "monthly",
        nextDate: "2026-08-02",
        expectedAmount: 1000,
      }),
    ];
    const result = expectedIncomeWithin(sources, 14, AS_OF);
    expect(result.count).toBe(1);
  });

  it("projects monthly income from anchor when next occurrence is in window", () => {
    const sources = [
      income({
        id: "i1",
        source: "Salary",
        frequency: "monthly",
        nextDate: "2026-05-15",
        expectedAmount: 3500,
      }),
    ];
    const july = expectedIncomeWithin(sources, 14, "2026-07-10");
    expect(july.count).toBe(1);
    expect(july.total).toBe(3500);
  });

  it("includes income crossing a year boundary", () => {
    const sources = [
      income({
        id: "i1",
        source: "Holiday bonus",
        frequency: "monthly",
        nextDate: "2025-12-28",
        expectedAmount: 500,
      }),
    ];
    const result = expectedIncomeWithin(sources, 14, "2025-12-20");
    expect(result.count).toBe(1);
  });

  it("includes biweekly income crossing month boundary", () => {
    const sources = [
      income({
        id: "i1",
        source: "Payroll",
        frequency: "biweekly",
        nextDate: "2026-07-28",
        expectedAmount: 1500,
      }),
    ];
    const result = expectedIncomeWithin(sources, 14, AS_OF);
    expect(result.count).toBe(1);
  });

  it("excludes inactive income", () => {
    const sources = [
      income({
        id: "i1",
        source: "Old job",
        active: false,
        nextDate: "2026-07-20",
      }),
    ];
    const result = expectedIncomeWithin(sources, 14, AS_OF);
    expect(result.count).toBe(0);
  });

  it("returns zero when no income matches", () => {
    expect(expectedIncomeWithin([], 14, AS_OF)).toEqual({
      total: 0,
      count: 0,
      occurrenceCount: 0,
      items: [],
    });
  });

  it("counts two biweekly paychecks within 14 days", () => {
    const sources = [
      income({
        id: "i1",
        source: "Payroll",
        frequency: "biweekly",
        nextDate: "2026-07-19",
        expectedAmount: 1500,
      }),
    ];
    const result = expectedIncomeWithin(sources, 14, AS_OF);
    expect(result.occurrenceCount).toBe(2);
    expect(result.total).toBe(3000);
    expect(result.count).toBe(1);
  });

  it("excludes received occurrence but includes next recurring one", () => {
    const sources = [
      income({
        id: "i1",
        source: "Salary",
        frequency: "monthly",
        nextDate: "2026-07-15",
        lastReceivedAt: "2026-07-15",
        expectedAmount: 2000,
      }),
    ];
    const july = expectedIncomeWithin(sources, 14, AS_OF);
    expect(july.count).toBe(0);

    const august = expectedIncomeWithin(sources, 14, "2026-08-01");
    expect(august.count).toBe(1);
    expect(august.total).toBe(2000);
  });
});

describe("getBillEffectiveDueDate", () => {
  it("returns most recent overdue within lookback, else next upcoming", () => {
    const b = bill({
      id: "b1",
      name: "Insurance",
      dueDate: "2026-02-01",
    });
    expect(getBillEffectiveDueDate(b, AS_OF)).toBe("2026-07-01");
  });
});

describe("timezone-sensitive parsing", () => {
  it("parses dates at local midnight without shifting calendar day", () => {
    const bills = [
      bill({ id: "b1", name: "Late bill", dueDate: "2026-07-19", amount: 25 }),
    ];
    const result = billsDueWithin(bills, 0, "2026-07-19T23:30:00");
    expect(result.count).toBe(1);
  });
});
