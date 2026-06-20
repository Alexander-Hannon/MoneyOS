import { getPrisma } from "@/lib/db/prisma";
import { hashPlaidId } from "@/lib/plaid/plaid-hash";
import {
  deletePlaidItemHistory,
  listActivePlaidItemsForUser,
  markPlaidItemDisconnected,
} from "@/lib/db/plaid-items";

export type DuplicateRepairDryRun = {
  duplicateInstitutions: Array<{
    institutionKey: string;
    institutionName: string;
    items: Array<{
      plaidItemId: string;
      itemIdHash: string | null;
      lastSyncAt: string | null;
      createdAt: string;
      accountCount: number;
      transactionCount: number;
      recommended: "keep" | "disconnect";
    }>;
  }>;
  duplicateAccounts: Array<{
    plaidAccountIdHash: string;
    accountIds: string[];
    names: string[];
    institutions: string[];
  }>;
  duplicateTransactionCandidates: number;
};

function scoreItem(item: {
  lastSyncAt: Date | null;
  createdAt: Date;
  accountCount: number;
  transactionCount: number;
}) {
  const sync = item.lastSyncAt?.getTime() ?? 0;
  const created = item.createdAt.getTime();
  return sync * 10 + item.accountCount * 100 + item.transactionCount + created / 1_000_000;
}

export async function dryRunDuplicateRepair(
  userId: string,
): Promise<DuplicateRepairDryRun> {
  const prisma = getPrisma();
  if (!prisma) {
    return {
      duplicateInstitutions: [],
      duplicateAccounts: [],
      duplicateTransactionCandidates: 0,
    };
  }

  const items = await listActivePlaidItemsForUser(userId, "production");
  const accounts = await prisma.account.findMany({
    where: { userId, source: "plaid_live", connectionStatus: "connected" },
    select: {
      id: true,
      name: true,
      institution: true,
      plaidAccountIdHash: true,
      plaidItemId: true,
    },
  });

  const txCounts = await prisma.moneyTransaction.groupBy({
    by: ["plaidItemId"],
    where: { userId, source: "plaid_live" },
    _count: { _all: true },
  });
  const txByItem = new Map(
    txCounts.map((row) => [row.plaidItemId, row._count._all]),
  );

  const byInstitution = new Map<string, typeof items>();
  for (const item of items) {
    const key = item.institutionId
      ? hashPlaidId(item.institutionId)
      : (item.institutionName ?? item.id).toLowerCase();
    const list = byInstitution.get(key) ?? [];
    list.push(item);
    byInstitution.set(key, list);
  }

  const duplicateInstitutions = [...byInstitution.entries()]
    .filter(([, group]) => group.length > 1)
    .map(([institutionKey, group]) => {
      const enriched = group.map((item) => {
        const accountCount = accounts.filter((a) => a.plaidItemId === item.id).length;
        const transactionCount = txByItem.get(item.id) ?? 0;
        return {
          item,
          accountCount,
          transactionCount,
          score: scoreItem({
            lastSyncAt: item.lastSyncAt,
            createdAt: item.createdAt,
            accountCount,
            transactionCount,
          }),
        };
      });
      enriched.sort((a, b) => b.score - a.score);
      const keepId = enriched[0]?.item.id;
      return {
        institutionKey,
        institutionName: group[0]?.institutionName ?? "Connected bank",
        items: enriched.map(({ item, accountCount, transactionCount }) => ({
          plaidItemId: item.id,
          itemIdHash: item.itemIdHash,
          lastSyncAt: item.lastSyncAt?.toISOString() ?? null,
          createdAt: item.createdAt.toISOString(),
          accountCount,
          transactionCount,
          recommended: item.id === keepId ? ("keep" as const) : ("disconnect" as const),
        })),
      };
    });

  const accountGroups = new Map<string, typeof accounts>();
  for (const account of accounts) {
    if (!account.plaidAccountIdHash) continue;
    const list = accountGroups.get(account.plaidAccountIdHash) ?? [];
    list.push(account);
    accountGroups.set(account.plaidAccountIdHash, list);
  }

  const duplicateAccounts = [...accountGroups.entries()]
    .filter(([, group]) => group.length > 1)
    .map(([plaidAccountIdHash, group]) => ({
      plaidAccountIdHash,
      accountIds: group.map((a) => a.id),
      names: group.map((a) => a.name),
      institutions: [...new Set(group.map((a) => a.institution))],
    }));

  const duplicateTransactionCandidates = duplicateAccounts.reduce(
    (sum, group) => sum + Math.max(0, group.accountIds.length - 1),
    0,
  );

  return {
    duplicateInstitutions,
    duplicateAccounts,
    duplicateTransactionCandidates,
  };
}

export async function executeDuplicateRepair(args: {
  userId: string;
  deleteHistoryForDisconnected?: boolean;
}) {
  const dryRun = await dryRunDuplicateRepair(args.userId);
  const disconnected: string[] = [];

  for (const group of dryRun.duplicateInstitutions) {
    for (const item of group.items) {
      if (item.recommended === "keep") continue;
      await markPlaidItemDisconnected(args.userId, item.plaidItemId);
      disconnected.push(item.plaidItemId);
      if (args.deleteHistoryForDisconnected) {
        await deletePlaidItemHistory(args.userId, item.plaidItemId);
      } else {
        const prisma = getPrisma();
        if (prisma) {
          await prisma.account.updateMany({
            where: { userId: args.userId, plaidItemId: item.plaidItemId },
            data: { connectionStatus: "disconnected" },
          });
        }
      }
    }
  }

  return {
    disconnectedItemIds: disconnected,
    dryRun,
  };
}
