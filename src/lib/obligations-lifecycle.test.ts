import { describe, expect, it } from "vitest";
import type { Bill, IncomeSource, Subscription } from "@/types/money";
import { billsDueThisMonth, expectedIncomeWithin } from "@/lib/money-utils";
import {
  deriveBillPhase,
  deriveSubscriptionPhase,
  partitionBills,
  partitionSubscriptions,
} from "@/lib/obligations-lifecycle";
import {
  getBillEffectiveDueDate,
  getSubscriptionNextRenewalDate,
  monthlyOccurrenceYMD,
} from "@/lib/recurrence";

const AUG_10 = "2026-08-10";
const AUG_1 = "2026-08-01";
const SEP_1 = "2026-09-01";
const JUL_19 = "2026-07-19";

function bill(overrides: Partial<Bill> & Pick<Bill, "id" | "name">): Bill {
  return {
    amount: 1200,
    amountType: "fixed",
    dueDate: "2026-08-01",
    frequency: "monthly",
    autopay: false,
    paidFrom: "Checking",
    status: "unpaid",
    ...overrides,
  };
}

function subscription(
  overrides: Partial<Subscription> & Pick<Subscription, "id" | "name">,
): Subscription {
  return {
    amount: 15,
    frequency: "monthly",
    category: "Software",
    status: "keep",
    renewalDate: "2026-08-12",
    ...overrides,
  };
}

describe("partitionBills lifecycle", () => {
  it("includes monthly bill due today when prior cycle is paid", () => {
    const { active } = partitionBills(
      [
        bill({
          id: "b1",
          name: "Rent",
          dueDate: "2026-01-01",
          lastPaidAt: "2026-07-01",
        }),
      ],
      AUG_1,
    );
    expect(active).toHaveLength(1);
    expect(active[0].occurrenceDate).toBe(AUG_1);
    expect(active[0].phase).toBe("due_today");
  });

  it("moves paid bill out of active and into completed", () => {
    const rent = bill({
      id: "b1",
      name: "Rent",
      dueDate: "2026-01-01",
      lastPaidAt: AUG_1,
    });
    const { active, completed } = partitionBills([rent], AUG_1);
    expect(active).toHaveLength(1);
    expect(active[0].occurrenceDate).toBe(SEP_1);
    expect(completed).toHaveLength(1);
    expect(completed[0].occurrenceDate).toBe(AUG_1);
  });

  it("returns next month occurrence after paid recurring bill", () => {
    const rent = bill({
      id: "b1",
      name: "Rent",
      dueDate: "2026-01-01",
      lastPaidAt: AUG_1,
    });
    const { active } = partitionBills([rent], "2026-08-15");
    expect(active[0]?.occurrenceDate).toBe(SEP_1);
  });

  it("preserves paid history while showing next occurrence", () => {
    const rent = bill({
      id: "b1",
      name: "Rent",
      dueDate: "2026-01-01",
      lastPaidAt: AUG_1,
    });
    const august = partitionBills([rent], AUG_10);
    expect(august.completed[0].occurrenceDate).toBe(AUG_1);
    expect(august.active[0].occurrenceDate).toBe(SEP_1);
  });

  it("does not return one-time paid bill to active", () => {
    const fee = bill({
      id: "b1",
      name: "Fee",
      frequency: "one-time",
      dueDate: AUG_1,
      lastPaidAt: AUG_1,
      status: "unpaid",
    });
    const { active, completed } = partitionBills([fee], AUG_10);
    expect(active).toHaveLength(0);
    expect(completed).toHaveLength(1);
  });

  it("keeps one-time overdue bill in active", () => {
    const fee = bill({
      id: "b1",
      name: "Fee",
      frequency: "one-time",
      dueDate: "2026-07-01",
    });
    const { active } = partitionBills([fee], AUG_1);
    expect(active[0].phase).toBe("overdue");
  });

  it("shows scheduled bill in active with scheduled phase", () => {
    const rent = bill({
      id: "b1",
      name: "Rent",
      status: "scheduled",
      scheduledForDate: AUG_1,
    });
    const phase = deriveBillPhase(rent, AUG_1, AUG_1);
    expect(phase).toBe("scheduled");
    expect(partitionBills([rent], AUG_1).active[0].phase).toBe("scheduled");
  });

  it("flags scheduled bill past due as needs confirmation", () => {
    const rent = bill({
      id: "b1",
      name: "Rent",
      status: "scheduled",
      scheduledForDate: "2026-07-28",
    });
    expect(deriveBillPhase(rent, "2026-07-28", AUG_1)).toBe("needs_confirmation");
  });

  it("handles bill due on 31st in February", () => {
    expect(monthlyOccurrenceYMD("2026-01-31", 2026, 1)).toBe("2026-02-28");
    const { active } = partitionBills(
      [
        bill({
          id: "b1",
          name: "HOA",
          dueDate: "2026-01-31",
          lastPaidAt: "2026-01-31",
        }),
      ],
      "2026-02-28",
    );
    expect(active[0].occurrenceDate).toBe("2026-02-28");
  });

  it("handles December to January rollover", () => {
    const { active } = partitionBills(
      [
        bill({
          id: "b1",
          name: "Insurance",
          dueDate: "2025-12-15",
          lastPaidAt: "2025-12-15",
        }),
      ],
      "2026-01-10",
    );
    expect(active[0].occurrenceDate).toBe("2026-01-15");
  });

  it("excludes review bills from active work queue", () => {
    const { active } = partitionBills(
      [bill({ id: "b1", name: "Mystery", status: "review" })],
      AUG_1,
    );
    expect(active).toHaveLength(0);
  });
});

describe("partitionSubscriptions lifecycle", () => {
  it("shows monthly subscription renewal in active list", () => {
    const { active } = partitionSubscriptions(
      [subscription({ id: "s1", name: "Spotify" })],
      "2026-08-10",
    );
    expect(active[0].occurrenceDate).toBe("2026-08-12");
  });

  it("moves renewed subscription to completed and advances next cycle", () => {
    const sub = subscription({
      id: "s1",
      name: "Spotify",
      lastRenewedAt: "2026-08-12",
    });
    const { active, completed } = partitionSubscriptions([sub], "2026-08-15");
    expect(completed[0].occurrenceDate).toBe("2026-08-12");
    expect(active[0].occurrenceDate).toBe("2026-09-12");
  });

  it("handles annual subscription recurrence", () => {
    const sub = subscription({
      id: "s1",
      name: "Annual",
      frequency: "annual",
      renewalDate: "2025-08-20",
    });
    expect(getSubscriptionNextRenewalDate(sub, "2026-08-10")).toBe("2026-08-20");
  });

  it("excludes canceled subscription from active renewals", () => {
    const { active } = partitionSubscriptions(
      [subscription({ id: "s1", name: "Old", status: "cancel" })],
      AUG_1,
    );
    expect(active).toHaveLength(0);
  });
});

describe("dashboard alignment", () => {
  it("calculates Bills Due This Month from active occurrences", () => {
    const bills = [
      bill({ id: "b1", name: "Rent", dueDate: "2026-01-01" }),
      bill({
        id: "b2",
        name: "Paid rent",
        dueDate: "2026-01-05",
        lastPaidAt: AUG_1,
      }),
    ];
    const result = billsDueThisMonth(bills, AUG_1);
    expect(result.count).toBe(2);
  });

  it("calculates upcoming income within 14 days", () => {
    const income: IncomeSource[] = [
      {
        id: "i1",
        source: "Pay",
        expectedAmount: 500,
        amountType: "fixed",
        frequency: "monthly",
        reliability: "high",
        active: true,
        nextDate: "2026-08-14",
      },
    ];
    const result = expectedIncomeWithin(income, 14, AUG_1);
    expect(result.count).toBe(1);
  });

  it("returns empty partitions cleanly", () => {
    expect(partitionBills([], AUG_1)).toEqual({ active: [], completed: [] });
    expect(expectedIncomeWithin([], 14, AUG_1).total).toBe(0);
  });

  it("does not duplicate occurrences for one bill in active list", () => {
    const { active } = partitionBills(
      [bill({ id: "b1", name: "Rent", dueDate: "2026-01-01" })],
      AUG_1,
    );
    expect(active.filter((v) => v.bill.id === "b1")).toHaveLength(1);
  });
});

describe("month transition", () => {
  it("shows September bill on September 1 after August payment", () => {
    const rent = bill({
      id: "b1",
      name: "Rent",
      dueDate: "2026-01-01",
      lastPaidAt: AUG_1,
    });
    const sep = partitionBills([rent], SEP_1);
    expect(sep.active[0].occurrenceDate).toBe(SEP_1);
    expect(sep.completed[0].occurrenceDate).toBe(AUG_1);
  });

  it("updates effective due date after month change", () => {
    const rent = bill({ id: "b1", name: "Rent", dueDate: "2026-01-01" });
    expect(getBillEffectiveDueDate(rent, JUL_19)).toBe("2026-07-01");
    expect(getBillEffectiveDueDate(rent, AUG_10)).toBe(AUG_1);
  });
});

describe("deriveSubscriptionPhase", () => {
  it("marks renewed occurrence as paid_this_cycle", () => {
    const sub = subscription({
      id: "s1",
      name: "App",
      lastRenewedAt: "2026-08-12",
    });
    expect(
      deriveSubscriptionPhase(sub, "2026-08-12", "2026-08-12"),
    ).toBe("paid_this_cycle");
  });
});
