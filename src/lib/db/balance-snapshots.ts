import { getPrisma } from "@/lib/db/prisma";
import type { DataSource } from "@/types/transactions";

export type PlaidSnapshotSource = Extract<DataSource, "plaid_live" | "plaid_sandbox">;

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
  source: PlaidSnapshotSource;
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

/** Snapshots for one source (never mixes Personal Live with Sandbox). */
export async function listBalanceSnapshotsForUser(args: {
  userId: string;
  source: PlaidSnapshotSource;
  sinceDate?: string;
}) {
  const prisma = getPrisma();
  if (!prisma) return { accounts: [], snapshots: [] };

  const snapshots = await prisma.balanceSnapshot.findMany({
    where: {
      userId: args.userId,
      source: args.source,
      ...(args.sinceDate ? { snapshotDate: { gte: args.sinceDate } } : {}),
    },
    orderBy: { snapshotDate: "asc" },
    select: {
      accountId: true,
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
        select: { id: true, name: true, institution: true, type: true, mask: true },
      })
    : [];

  return { accounts, snapshots };
}
