import { describe, expect, it } from "vitest";
import type { MoneyTransaction } from "@/types/transactions";
import { availableFlowMonths, buildMoneyFlow } from "@/lib/money-flow";

let n = 0;
function txn(overrides: Partial<MoneyTransaction>): MoneyTransaction {
  n += 1;
  return {
    id: `t${n}`,
    accountId: "acc",
    date: "2026-10-05",
    merchantName: "Store",
    description: "",
    amount: -10,
    type: "debit",
    classification: "spending",
    category: "Other",
    pending: false,
    source: "plaid_live",
    needsReview: false,
    ...overrides,
  } as MoneyTransaction;
}

describe("buildMoneyFlow", () => {
  it("balances income against spending with a left-over node", () => {
    const f = buildMoneyFlow(
      [
        txn({ classification: "income", merchantName: "Employer", amount: 2000, type: "income" }),
        txn({ category: "Food", amount: -300 }),
        txn({ category: "Gas", amount: -200 }),
      ],
      "2026-10",
    );
    expect(f.totalIn).toBe(2000);
    expect(f.totalOut).toBe(500);
    expect(f.net).toBe(1500);
    expect(f.uses.find((u) => u.group === "leftover")?.value).toBe(1500);
    expect(f.sources.reduce((s, x) => s + x.value, 0)).toBe(f.uses.reduce((s, x) => s + x.value, 0));
  });

  it("adds a drawn-from-balances source when spending exceeds income", () => {
    const f = buildMoneyFlow(
      [
        txn({ classification: "income", merchantName: "Job", amount: 100, type: "income" }),
        txn({ amount: -400 }),
      ],
      "2026-10",
    );
    expect(f.net).toBe(-300);
    expect(f.sources.find((s) => s.group === "drawn")?.value).toBe(300);
  });

  it("keeps transfers and card payments out of the flow", () => {
    const f = buildMoneyFlow(
      [
        txn({ classification: "transfer", amount: -500, type: "transfer" }),
        txn({ classification: "transfer", amount: 500, type: "transfer" }),
        txn({ classification: "credit_card_payment", amount: -250, type: "payment" }),
        txn({ amount: -50, isTransferInternal: true }),
      ],
      "2026-10",
    );
    expect(f.totalIn).toBe(0);
    expect(f.totalOut).toBe(0);
    expect(f.movedBetweenAccounts).toBe(800);
  });

  it("routes linked transactions to bills and subscriptions, and splits refunds, fees, review", () => {
    const f = buildMoneyFlow(
      [
        txn({ amount: -1200, linkedBillId: "rent" }),
        txn({ amount: -15, linkedSubscriptionId: "tv" }),
        txn({ classification: "refund", amount: 30, type: "refund" }),
        txn({ classification: "fee", amount: -5, type: "fee" }),
        txn({ classification: "review", amount: -40 }),
      ],
      "2026-10",
    );
    const byGroup = Object.fromEntries(f.uses.map((u) => [u.group, u.value]));
    expect(byGroup.bill).toBe(1200);
    expect(byGroup.subscription).toBe(15);
    expect(byGroup.fee).toBe(5);
    expect(byGroup.review).toBe(40);
    expect(f.sources.find((s) => s.group === "refund")?.value).toBe(30);
  });

  it("folds extra categories into Other spending and respects user categories", () => {
    const cats = ["A", "B", "C", "D", "E", "F", "G", "H"];
    const f = buildMoneyFlow(
      [
        ...cats.map((c, i) => txn({ category: c as MoneyTransaction["category"], amount: -(100 - i) })),
        txn({ category: "Other", userConfirmedCategory: "Gifts", amount: -5 }),
      ],
      "2026-10",
    );
    const spending = f.uses.filter((u) => u.group === "spending");
    expect(spending).toHaveLength(7);
    expect(spending[6].label).toBe("Other spending");
    expect(spending[6].value).toBe(94 + 93 + 5);
  });

  it("only uses the selected month", () => {
    const txns = [txn({ date: "2026-09-30", amount: -99 }), txn({ date: "2026-10-01", amount: -1 })];
    expect(buildMoneyFlow(txns, "2026-10").totalOut).toBe(1);
    expect(availableFlowMonths(txns)).toEqual(["2026-10", "2026-09"]);
  });
});
