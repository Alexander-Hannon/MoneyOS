import { describe, expect, it } from "vitest";
import type { Bill, IncomeSource, Subscription } from "@/types/money";
import type { MoneyTransaction } from "@/types/transactions";
import { computeSpendingPlan, sanitizePlanSettings } from "@/lib/spending-plan";

const AS_OF = "2026-10-10"; // 31-day month, day 10

const income: IncomeSource[] = [
  { id: "pay", source: "Job", expectedAmount: 4000, amountType: "fixed", frequency: "monthly", reliability: "high", active: true, nextDate: "2026-10-31" },
];
const bills: Bill[] = [
  { id: "rent", name: "Rent", amount: 1500, amountType: "fixed", dueDate: "2026-10-01", frequency: "monthly", autopay: false, paidFrom: "Checking", status: "unpaid" },
];
const subs: Subscription[] = [
  { id: "tv", name: "TV", amount: 20, frequency: "monthly", category: "Streaming", status: "keep" },
  { id: "x", name: "Old", amount: 50, frequency: "monthly", category: "Misc", status: "cancel" },
];

let n = 0;
function txn(o: Partial<MoneyTransaction>): MoneyTransaction {
  n += 1;
  return {
    id: `t${n}`, accountId: "a", date: "2026-10-05", merchantName: "M", description: "",
    amount: -10, type: "debit", classification: "spending", category: "Food",
    pending: false, source: "plaid_live", needsReview: false, ...o,
  } as MoneyTransaction;
}

describe("computeSpendingPlan", () => {
  it("derives the flex budget from income, fixed costs, and savings", () => {
    const p = computeSpendingPlan({
      income, bills, subscriptions: subs, transactions: [],
      settings: { savingsTarget: 500, categoryCaps: {} }, asOf: AS_OF,
    });
    expect(p.expectedIncome).toBe(4000);
    expect(p.fixedTotal).toBe(1520);
    expect(p.flexBudget).toBe(1980);
    expect(p.daysInMonth).toBe(31);
    expect(p.daysLeft).toBe(22);
    expect(p.dailyAllowance).toBe(90);
  });

  it("counts only unlinked spending this month and tracks pace", () => {
    const p = computeSpendingPlan({
      income, bills, subscriptions: subs,
      transactions: [
        txn({ date: "2026-10-02", amount: -300, category: "Food" }),
        txn({ date: "2026-10-09", amount: -200, category: "Gas" }),
        txn({ date: "2026-10-01", amount: -1500, linkedBillId: "rent" }),
        txn({ date: "2026-10-03", amount: -20, linkedSubscriptionId: "tv" }),
        txn({ date: "2026-10-04", amount: -400, classification: "transfer" }),
        txn({ date: "2026-10-06", amount: -45, classification: "review" }),
        txn({ date: "2026-10-12", amount: -999 }), // after today
        txn({ date: "2026-09-15", amount: -250, category: "Food" }),
      ],
      settings: { savingsTarget: 0, categoryCaps: { Food: 600 } }, asOf: AS_OF,
    });
    expect(p.flexSpent).toBe(500);
    expect(p.unreviewed).toEqual({ count: 1, total: 45 });
    const food = p.categories.find((c) => c.category === "Food")!;
    expect(food).toMatchObject({ spent: 300, lastMonth: 250, cap: 600 });
    expect(p.pace[1].actual).toBe(300);
    expect(p.pace[8].actual).toBe(500);
    expect(p.pace[10].actual).toBeNull();
    expect(p.paceByToday).toBeCloseTo((2480 * 10) / 31, 2);
    expect(p.paceDelta).toBeLessThan(0);
  });

  it("keeps unlinked bill payments out of flexible spending", () => {
    const p = computeSpendingPlan({
      income, bills, subscriptions: subs,
      transactions: [txn({ category: "Bills", amount: -90 }), txn({ category: "Food", amount: -10 })],
      settings: { savingsTarget: 0, categoryCaps: {} }, asOf: AS_OF,
    });
    expect(p.flexSpent).toBe(10);
    expect(p.unlinkedBillPayments).toEqual({ count: 1, total: 90 });
    expect(p.categories.map((c) => c.category)).toEqual(["Food"]);
  });

  it("uses the user's confirmed category over the default one", () => {
    const p = computeSpendingPlan({
      income, bills, subscriptions: subs,
      transactions: [txn({ category: "Other", userConfirmedCategory: "Gifts", amount: -40 })],
      settings: { savingsTarget: 0, categoryCaps: {} }, asOf: AS_OF,
    });
    expect(p.categories.map((c) => c.category)).toEqual(["Gifts"]);
  });

  it("reports a negative flex budget honestly and allows no daily spending", () => {
    const p = computeSpendingPlan({
      income, bills, subscriptions: subs, transactions: [],
      settings: { savingsTarget: 3000, categoryCaps: {} }, asOf: AS_OF,
    });
    expect(p.flexBudget).toBe(-520);
    expect(p.dailyAllowance).toBe(0);
    expect(p.pace[30].pace).toBe(0);
  });
});

describe("sanitizePlanSettings", () => {
  it("drops invalid values", () => {
    expect(sanitizePlanSettings({ savingsTarget: -5, categoryCaps: { Food: 200, Bad: "x", Zero: 0 } })).toEqual({
      savingsTarget: 0,
      categoryCaps: { Food: 200 },
    });
    expect(sanitizePlanSettings(null)).toEqual({ savingsTarget: 0, categoryCaps: {} });
  });
});
