import { getPrisma } from "@/lib/db/prisma";
import type { DataSource } from "@/types/transactions";

export type PlaidSnapshotSource = Extract<DataSource, "plaid_live" | "plaid_sandbox">;
export type SnapshotSource = PlaidSnapshotSource | "manual";

/** UTC calendar day used as the one-per-day snapshot key. */
export function snapshotDateFor(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Record today's balance for each account. Idempotent: a second reading on
 * the same day replaces that day's value instead of adding a row.
 * Accounts without any reported balance are skipped — nothing is invented.
 */
export async function recordBalanceSnapshots(args: {
  userId: string;
  source: SnapshotSource;
  accounts: Array<{
    accountId: string;
    accountType: string;
    currentBalance: number | null;
    availableBalance: number | null;
  }>;
  now?: Date;
}): Promise<number> {
  const prisma = getPrisma();
  if (!prisma) return 0;

  const capturedAt = args.now ?? new Date();
  const snapshotDate = snapshotDateFor(capturedAt);
  let written = 0;

  for (const a of args.accounts) {
    if (a.currentBalance == null && a.availableBalance == null) continue;
    await prisma.balanceSnapshot.upsert({
      where: { accountId_snapshotDate: { accountId: a.accountId, snapshotDate } },
      create: {
        userId: args.userId,
        accountId: a.accountId,
        source: args.source,
        accountType: a.accountType,
        snapshotDate,
        currentBalance: a.currentBalance,
        availableBalance: a.availableBalance,
        capturedAt,
      },
      update: {
        accountType: a.accountType,
        currentBalance: a.currentBalance,
        availableBalance: a.availableBalance,
        capturedAt,
      },
    });
    written++;
  }
  return written;
}

/** Account ids that already have at least one snapshot for a source. */
export async function accountIdsWithSnapshots(userId: string, source: SnapshotSource) {
  const prisma = getPrisma();
  if (!prisma) return new Set<string>();
  const rows = await prisma.balanceSnapshot.findMany({
    where: { userId, source },
    distinct: ["accountId"],
    select: { accountId: true },
  });
  return new Set(rows.map((r) => r.accountId));
}

/**
 * Snapshots for the requested sources. Callers must never combine
 * plaid_sandbox with plaid_live or manual (Sandbox data is not real).
 */
export async function listBalanceSnapshotsForUser(args: {
  userId: string;
  sources: SnapshotSource[];
  sinceDate?: string;
}) {
  const prisma = getPrisma();
  if (!prisma) return { accounts: [], snapshots: [] };

  const snapshots = await prisma.balanceSnapshot.findMany({
    where: {
      userId: args.userId,
      source: { in: args.sources },
      ...(args.sinceDate ? { snapshotDate: { gte: args.sinceDate } } : {}),
    },
    orderBy: { snapshotDate: "asc" },
    select: {
      accountId: true,
      source: true,
      accountType: true,
      snapshotDate: true,
      currentBalance: true,
      availableBalance: true,
      capturedAt: true,
    },
  });

  const accountIds = [...new Set(snapshots.map((s) => s.accountId))];
  const accounts = accountIds.length
    ? await prisma.account.findMany({
        where: { userId: args.userId, id: { in: accountIds } },
        // Display-safe fields only — never Plaid identifiers.
        select: { id: true, name: true, institution: true, type: true, mask: true, source: true },
      })
    : [];

  return { accounts, snapshots };
}
