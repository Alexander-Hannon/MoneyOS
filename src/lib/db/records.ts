import { getPrisma } from "@/lib/db/prisma";
import {
  mapAlertFields,
  mapBillFields,
  mapIncomeFields,
  mapManualAccountFields,
  mapPlannedExpenseFields,
  mapSubscriptionFields,
} from "@/lib/db/users";
import {
  accountIdsWithSnapshots,
  recordBalanceSnapshots,
} from "@/lib/db/balance-snapshots";

/*
 * Per-record writes for account-backed data. The database is canonical:
 * clients send only the records that changed. Upserts are keyed by the
 * record's stable id and scoped to the signed-in user, so retries are
 * idempotent and one user can never write another user's rows.
 */

export const RECORD_ENTITIES = [
  "bills",
  "income",
  "subscriptions",
  "alerts",
  "spendingLater",
  "manualAccounts",
] as const;
export type RecordEntity = (typeof RECORD_ENTITIES)[number];

export const MAX_RECORDS_PER_REQUEST = 200;
const ID_PATTERN = /^[A-Za-z0-9_-]{1,100}$/;

export function isRecordEntity(value: unknown): value is RecordEntity {
  return typeof value === "string" && (RECORD_ENTITIES as readonly string[]).includes(value);
}

export function isValidRecordId(value: unknown): value is string {
  return typeof value === "string" && ID_PATTERN.test(value);
}

export class RecordOwnershipError extends Error {
  constructor() {
    super("Record belongs to another account.");
    this.name = "RecordOwnershipError";
  }
}

type Delegate = {
  findMany: (args: unknown) => Promise<Array<{ id: string; userId: string }>>;
  upsert: (args: unknown) => Promise<unknown>;
  deleteMany: (args: unknown) => Promise<{ count: number }>;
};

function delegateFor(entity: RecordEntity): Delegate {
  const prisma = getPrisma();
  if (!prisma) throw new Error("Database is not configured.");
  switch (entity) {
    case "bills":
      return prisma.bill as unknown as Delegate;
    case "income":
      return prisma.incomeSource as unknown as Delegate;
    case "subscriptions":
      return prisma.subscription as unknown as Delegate;
    case "alerts":
      return prisma.moneyAlert as unknown as Delegate;
    case "spendingLater":
      return prisma.plannedExpense as unknown as Delegate;
    case "manualAccounts":
      return prisma.account as unknown as Delegate;
  }
}

function mapFields(entity: RecordEntity, userId: string, row: Record<string, unknown>) {
  switch (entity) {
    case "bills":
      return mapBillFields(userId, row);
    case "income":
      return mapIncomeFields(userId, row);
    case "subscriptions":
      return mapSubscriptionFields(userId, row);
    case "alerts":
      return mapAlertFields(userId, row);
    case "spendingLater":
      return mapPlannedExpenseFields(userId, row);
    case "manualAccounts":
      return mapManualAccountFields(userId, row);
  }
}

export async function applyRecordChanges(args: {
  userId: string;
  entity: RecordEntity;
  upserts: Record<string, unknown>[];
  deletes: string[];
}): Promise<{ upserted: number; deleted: number }> {
  const prisma = getPrisma();
  if (!prisma) throw new Error("Database is not configured.");
  const model = delegateFor(args.entity);
  const ids = args.upserts.map((r) => String(r.id));

  // Ownership check before any write: an id owned by another user is refused.
  const existing = ids.length
    ? await model.findMany({ where: { id: { in: ids } }, select: { id: true, userId: true } })
    : [];
  if (existing.some((row) => row.userId !== args.userId)) {
    throw new RecordOwnershipError();
  }
  // The manual-account path must never rewrite a linked bank account.
  if (args.entity === "manualAccounts" && ids.length) {
    const linked = await prisma.account.count({
      where: { id: { in: ids }, source: { not: "manual" } },
    });
    if (linked > 0) throw new RecordOwnershipError();
  }

  // Manual balances: capture previous values to record history on change.
  const previousBalances = new Map<string, number | null>();
  if (args.entity === "manualAccounts" && ids.length) {
    const rows = await prisma.account.findMany({
      where: { id: { in: ids }, userId: args.userId },
      select: { id: true, currentBalance: true },
    });
    for (const r of rows) previousBalances.set(r.id, r.currentBalance);
  }

  for (const row of args.upserts) {
    const id = String(row.id);
    const data = mapFields(args.entity, args.userId, row);
    await model.upsert({ where: { id }, create: { id, ...data }, update: data });
  }

  let deleted = 0;
  if (args.deletes.length) {
    const where: Record<string, unknown> = { id: { in: args.deletes }, userId: args.userId };
    // Never let this path delete linked bank accounts.
    if (args.entity === "manualAccounts") where.source = "manual";
    deleted = (await model.deleteMany({ where })).count;
  }

  if (args.entity === "manualAccounts" && args.upserts.length) {
    await recordManualSnapshots(args.userId, args.upserts, previousBalances);
  }

  return { upserted: args.upserts.length, deleted };
}

async function recordManualSnapshots(
  userId: string,
  rows: Record<string, unknown>[],
  previous: Map<string, number | null>,
) {
  try {
    const withHistory = await accountIdsWithSnapshots(userId, "manual");
    const changed = rows
      .map((row) => {
        const id = String(row.id);
        const data = mapManualAccountFields(userId, row);
        const isNew = !previous.has(id);
        const balanceChanged = previous.get(id) !== data.currentBalance;
        if (data.currentBalance == null) return null;
        if (!isNew && !balanceChanged && withHistory.has(id)) return null;
        return {
          accountId: id,
          accountType: data.type,
          currentBalance: data.currentBalance,
          availableBalance: data.availableBalance,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x != null);
    if (changed.length) {
      await recordBalanceSnapshots({ userId, source: "manual", accounts: changed });
    }
  } catch (error) {
    console.warn(
      "[balance-history] manual snapshot write skipped:",
      error instanceof Error ? error.name : "unknown error",
    );
  }
}
