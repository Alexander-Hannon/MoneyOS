import { beforeEach, describe, expect, it, vi } from "vitest";

const snapshots = vi.hoisted(() => ({
  record: vi.fn(async () => 0),
  withHistory: vi.fn(async () => new Set<string>()),
}));

const db = vi.hoisted(() => {
  const model = () => ({
    findMany: vi.fn(async () => [] as Array<Record<string, unknown>>),
    upsert: vi.fn(async () => ({})),
    deleteMany: vi.fn(async () => ({ count: 0 })),
    count: vi.fn(async () => 0),
  });
  return {
    bill: model(),
    incomeSource: model(),
    subscription: model(),
    moneyAlert: model(),
    plannedExpense: model(),
    account: model(),
  };
});

vi.mock("@/lib/db/prisma", () => ({ getPrisma: () => db }));
vi.mock("@/lib/db/balance-snapshots", () => ({
  recordBalanceSnapshots: snapshots.record,
  accountIdsWithSnapshots: snapshots.withHistory,
}));

import { RecordOwnershipError, applyRecordChanges, isValidRecordId } from "@/lib/db/records";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("applyRecordChanges", () => {
  it("upserts by id and scopes deletes to the user", async () => {
    await applyRecordChanges({
      userId: "u1",
      entity: "bills",
      upserts: [{ id: "bill-1", name: "Rent", amount: 1200, dueDate: "2026-11-01", frequency: "monthly" }],
      deletes: ["bill-2"],
    });
    expect(db.bill.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "bill-1" }, create: expect.objectContaining({ id: "bill-1", userId: "u1" }) }),
    );
    expect(db.bill.deleteMany).toHaveBeenCalledWith({ where: { id: { in: ["bill-2"] }, userId: "u1" } });
  });

  it("refuses to write a record owned by another user", async () => {
    db.bill.findMany.mockResolvedValueOnce([{ id: "bill-1", userId: "someone-else" }]);
    await expect(
      applyRecordChanges({ userId: "u1", entity: "bills", upserts: [{ id: "bill-1", name: "x" }], deletes: [] }),
    ).rejects.toBeInstanceOf(RecordOwnershipError);
    expect(db.bill.upsert).not.toHaveBeenCalled();
  });

  it("never rewrites a linked bank account through the manual path", async () => {
    db.account.count.mockResolvedValueOnce(1);
    await expect(
      applyRecordChanges({ userId: "u1", entity: "manualAccounts", upserts: [{ id: "acc-1", name: "x" }], deletes: [] }),
    ).rejects.toBeInstanceOf(RecordOwnershipError);
    expect(db.account.upsert).not.toHaveBeenCalled();
  });

  it("only deletes manual accounts", async () => {
    await applyRecordChanges({ userId: "u1", entity: "manualAccounts", upserts: [], deletes: ["acct-1"] });
    expect(db.account.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: ["acct-1"] }, userId: "u1", source: "manual" },
    });
  });

  it("records manual balance history only when the balance changed", async () => {
    // findMany is called for the ownership check, then for previous balances.
    db.account.findMany
      .mockResolvedValueOnce([
        { id: "a1", userId: "u1" },
        { id: "a2", userId: "u1" },
      ])
      .mockResolvedValueOnce([
        { id: "a1", currentBalance: 100 },
        { id: "a2", currentBalance: 500 },
      ]);
    snapshots.withHistory.mockResolvedValueOnce(new Set(["a1", "a2"]));
    await applyRecordChanges({
      userId: "u1",
      entity: "manualAccounts",
      upserts: [
        { id: "a1", name: "Cash", type: "cash", balance: 100 },
        { id: "a2", name: "Savings", type: "savings", balance: 650 },
      ],
      deletes: [],
    });
    expect(snapshots.record).toHaveBeenCalledTimes(1);
    const [arg] = snapshots.record.mock.calls[0] as unknown as [{ accounts: { accountId: string }[] }];
    expect(arg.accounts.map((a) => a.accountId)).toEqual(["a2"]);
  });
});

describe("isValidRecordId", () => {
  it("accepts generated ids and rejects unsafe ones", () => {
    expect(isValidRecordId("bill-3f2a9c1e-7b1d-4e2a-9c3f-1a2b3c4d5e6f")).toBe(true);
    expect(isValidRecordId("")).toBe(false);
    expect(isValidRecordId("a b")).toBe(false);
    expect(isValidRecordId("x".repeat(101))).toBe(false);
    expect(isValidRecordId(42)).toBe(false);
  });
});
