import { describe, expect, it } from "vitest";
import type { Bill, IncomeSource, PlannedExpense, Subscription } from "@/types/money";
import { computeRunway, runwayRiskLevel } from "@/lib/runway";

const AS_OF = "2026-07-19";

function bill(overrides: Partial<Bill> & Pick<Bill, "id" | "name">): Bill {
  return {
    amount: 100,
    amountType: "fixed",
    dueDate: "2026-01-25",
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
    expectedAmount: 1000,
    amountType: "fixed",
    frequency: "monthly",
    reliability: "high",
    active: true,
    nextDate: "2026-07-31",
    ...overrides,
  };
}

function sub(overrides: Partial<Subscription> & Pick<Subscription, "id" | "name">): Subscription {
  return {
    amount: 15,
    frequency: "monthly",
    category: "Streaming",
    status: "keep",
    renewalDate: "2026-07-22",
    ...overrides,
  };
}

describe("computeRunway", () => {
  it("projects a flat line with no obligations", () => {
    const r = computeRunway({
      startingBalance: 500,
      bills: [],
      income: [],
      subscriptions: [],
      horizonDays: 14,
      asOf: AS_OF,
    });
    expect(r.days).toHaveLength(14);
    expect(r.startDate).toBe(AS_OF);
    expect(r.endDate).toBe("2026-08-01");
    expect(r.endingBalance).toBe(500);
    expect(r.safeToSpendToday).toBe(500);
    expect(runwayRiskLevel(r)).toBe("clear");
  });

  it("applies bills, subscriptions, and income on their dates", () => {
    const r = computeRunway({
      startingBalance: 1500,
      bills: [bill({ id: "rent", name: "Rent", amount: 1200, dueDate: "2026-01-25" })],
      income: [income({ id: "pay", source: "Paycheck" })],
      subscriptions: [sub({ id: "tv", name: "TV" })],
      horizonDays: 30,
      asOf: AS_OF,
    });
    const day = (d: string) => r.days.find((x) => x.date === d)!;
    expect(day("2026-07-22").balance).toBe(1485);
    expect(day("2026-07-25").balance).toBe(285);
    expect(day("2026-07-31").balance).toBe(1285);
    expect(r.lowest).toEqual({ date: "2026-07-25", balance: 285 });
    expect(r.safeToSpendToday).toBe(285);
    expect(r.nextIncome).toEqual({ date: "2026-07-31", amount: 1000, label: "Paycheck" });
  });

  it("subtracts the buffer from safe-to-spend and flags tight days", () => {
    const r = computeRunway({
      startingBalance: 400,
      bills: [bill({ id: "b", name: "Phone", amount: 300 })],
      income: [],
      subscriptions: [],
      buffer: 150,
      horizonDays: 10,
      asOf: AS_OF,
    });
    expect(r.safeToSpendToday).toBe(0);
    expect(r.firstBelowBufferDate).toBe("2026-07-25");
    expect(r.firstNegativeDate).toBeNull();
    expect(runwayRiskLevel(r)).toBe("tight");
  });

  it("detects a shortfall", () => {
    const r = computeRunway({
      startingBalance: 100,
      bills: [bill({ id: "b", name: "Rent", amount: 900 })],
      income: [],
      subscriptions: [],
      horizonDays: 10,
      asOf: AS_OF,
    });
    expect(r.firstNegativeDate).toBe("2026-07-25");
    expect(r.lowest.balance).toBe(-800);
    expect(r.safeToSpendToday).toBe(0);
    expect(runwayRiskLevel(r)).toBe("shortfall");
  });

  it("counts a recent unpaid manual bill today but skips past autopay", () => {
    const r = computeRunway({
      startingBalance: 1000,
      bills: [
        bill({ id: "late", name: "Electric", amount: 80, dueDate: "2026-01-16" }),
        bill({ id: "auto", name: "Insurance", amount: 120, dueDate: "2026-01-16", autopay: true }),
      ],
      income: [],
      subscriptions: [],
      horizonDays: 5,
      asOf: AS_OF,
    });
    const todayEvents = r.days[0].events;
    expect(todayEvents.map((e) => e.sourceId)).toEqual(["late"]);
    expect(todayEvents[0].overdue).toBe(true);
    expect(todayEvents[0].occurrenceDate).toBe("2026-07-16");
    expect(r.exclusions.some((x) => x.sourceId === "auto")).toBe(true);
  });

  it("skips paid occurrences", () => {
    const r = computeRunway({
      startingBalance: 1000,
      bills: [bill({ id: "b", name: "Rent", amount: 900, lastPaidAt: "2026-07-25" })],
      income: [],
      subscriptions: [],
      horizonDays: 10,
      asOf: AS_OF,
    });
    expect(r.events).toHaveLength(0);
  });

  it("excludes unknown amounts, review bills, and non-approved subscriptions", () => {
    const r = computeRunway({
      startingBalance: 1000,
      bills: [
        bill({ id: "v", name: "Water", amount: null, amountType: "variable" }),
        bill({ id: "r", name: "Gym", status: "review" }),
      ],
      income: [income({ id: "c", source: "Commission", amountType: "variable", nextDate: undefined, expectedAmount: null })],
      subscriptions: [sub({ id: "s", name: "Music", status: "review" })],
      horizonDays: 30,
      asOf: AS_OF,
    });
    expect(r.events).toHaveLength(0);
    expect(r.exclusions.map((x) => x.sourceId).sort()).toEqual(["c", "r", "s", "v"]);
  });

  it("includes active planned expenses inside the horizon only", () => {
    const planned: PlannedExpense[] = [
      { id: "p1", name: "Flight", amount: 300, targetDate: "2026-07-28", category: "Travel", status: "saving" },
      { id: "p2", name: "Laptop", amount: 900, targetDate: "2026-09-01", category: "Tech", status: "planned" },
      { id: "p3", name: "Done", amount: 50, targetDate: "2026-07-21", category: "Misc", status: "completed" },
    ];
    const r = computeRunway({
      startingBalance: 1000,
      bills: [],
      income: [],
      subscriptions: [],
      plannedExpenses: planned,
      horizonDays: 30,
      asOf: AS_OF,
    });
    expect(r.events.map((e) => e.sourceId)).toEqual(["p1"]);
    expect(r.endingBalance).toBe(700);
  });

  it("expands biweekly income into multiple occurrences", () => {
    const r = computeRunway({
      startingBalance: 0,
      bills: [],
      income: [income({ id: "bw", source: "Job", frequency: "biweekly", nextDate: "2026-07-24", expectedAmount: 800 })],
      subscriptions: [],
      horizonDays: 30,
      asOf: AS_OF,
    });
    expect(r.events.map((e) => e.date)).toEqual(["2026-07-24", "2026-08-07"]);
    expect(r.totals.inflow).toBe(1600);
  });
});
