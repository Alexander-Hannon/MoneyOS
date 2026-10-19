import { getPrisma } from "@/lib/db/prisma";
import type { DataSource, LinkedAccount } from "@/types/transactions";
import { hashPlaidId } from "@/lib/plaid/plaid-hash";
import type { PlaidEnvironment } from "@/lib/plaid/plaid-env";
import { plaidSourceForEnvironment } from "@/lib/plaid/plaid-env";
import { recordBalanceSnapshots } from "@/lib/db/balance-snapshots";

export async function listPlaidAccountsForUser(
  userId: string,
  environment?: PlaidEnvironment,
) {
  const prisma = getPrisma();
  if (!prisma) return [];

  const sources: DataSource[] = environment
    ? [plaidSourceForEnvironment(environment)]
    : ["plaid_sandbox", "plaid_live"];

  return prisma.account.findMany({
    where: {
      userId,
      source: { in: sources },
      connectionStatus: "connected",
    },
    orderBy: [{ institution: "asc" }, { name: "asc" }],
  });
}

export async function listAccountsForUser(userId: string) {
  const prisma = getPrisma();
  if (!prisma) return [];
  return prisma.account.findMany({
    where: { userId },
    orderBy: { name: "asc" },
  });
}

export function dbAccountToLinkedAccount(account: {
  id: string;
  name: string;
  institution: string;
  type: string;
  subtype: string | null;
  mask: string | null;
  currentBalance: number | null;
  availableBalance: number | null;
  source: string;
  connectionStatus: string;
}): LinkedAccount {
  return {
    id: account.id,
    name: account.name,
    institution: account.institution,
    type: account.type as LinkedAccount["type"],
    subtype: account.subtype ?? undefined,
    mask: account.mask ?? undefined,
    currentBalance: account.currentBalance ?? undefined,
    availableBalance: account.availableBalance ?? undefined,
    source: account.source as LinkedAccount["source"],
    connectionStatus:
      account.connectionStatus as LinkedAccount["connectionStatus"],
  };
}

export async function upsertPlaidAccountsForItem(args: {
  userId: string;
  plaidItemId: string;
  source: DataSource;
  accounts: Array<{
    plaidAccountId: string;
    name: string;
    institution: string;
    type: string;
    subtype?: string | null;
    mask?: string | null;
    currentBalance?: number | null;
    availableBalance?: number | null;
  }>;
}) {
  const prisma = getPrisma();
  if (!prisma) throw new Error("Database is not configured.");

  const accountIdByPlaid = new Map<string, string>();
  const snapshotRows: Parameters<typeof recordBalanceSnapshots>[0]["accounts"] = [];

  for (const account of args.accounts) {
    const plaidAccountIdHash = hashPlaidId(account.plaidAccountId);
    const row = await prisma.account.upsert({
      where: {
        userId_plaidAccountIdHash: {
          userId: args.userId,
          plaidAccountIdHash,
        },
      },
      create: {
        userId: args.userId,
        plaidItemId: args.plaidItemId,
        plaidAccountId: account.plaidAccountId,
        plaidAccountIdHash,
        name: account.name,
        institution: account.institution,
        type: account.type,
        subtype: account.subtype ?? null,
        mask: account.mask ?? null,
        currentBalance: account.currentBalance ?? null,
        availableBalance: account.availableBalance ?? null,
        source: args.source,
        connectionStatus: "connected",
      },
      update: {
        plaidItemId: args.plaidItemId,
        plaidAccountId: account.plaidAccountId,
        name: account.name,
        institution: account.institution,
        type: account.type,
        subtype: account.subtype ?? null,
        mask: account.mask ?? null,
        currentBalance: account.currentBalance ?? null,
        availableBalance: account.availableBalance ?? null,
        source: args.source,
        connectionStatus: "connected",
      },
    });
    accountIdByPlaid.set(account.plaidAccountId, row.id);
    snapshotRows.push({
      accountId: row.id,
      accountType: account.type,
      currentBalance: account.currentBalance ?? null,
      availableBalance: account.availableBalance ?? null,
    });
  }

  // Balances only reach this function when Plaid reported them, so this is
  // the single place balance history is recorded. History is best-effort and
  // must never fail the account sync itself.
  if (args.source === "plaid_live" || args.source === "plaid_sandbox") {
    try {
      await recordBalanceSnapshots({
        userId: args.userId,
        source: args.source,
        accounts: snapshotRows,
      });
    } catch (error) {
      console.warn(
        "[balance-history] snapshot write skipped:",
        error instanceof Error ? error.name : "unknown error",
      );
    }
  }

  return accountIdByPlaid;
}

/** Phase 9 scaffold kept for manual account migration flows. */
export async function replaceAccountsForUser(
  userId: string,
  accounts: Record<string, unknown>[],
) {
  const prisma = getPrisma();
  if (!prisma) throw new Error("Database is not configured.");

  await prisma.$transaction(async (tx) => {
    await tx.account.deleteMany({
      where: { userId, source: { notIn: ["plaid_sandbox", "plaid_live"] } },
    });
    for (const account of accounts) {
      await tx.account.create({
        data: {
          id: account.id ? String(account.id) : undefined,
          userId,
          plaidAccountIdHash: account.plaidAccountIdHash
            ? String(account.plaidAccountIdHash)
            : null,
          name: String(account.name ?? "Account"),
          institution: String(account.institution ?? "Unknown"),
          type: String(account.type ?? "other"),
          subtype: account.subtype ? String(account.subtype) : null,
          mask: account.mask ? String(account.mask) : null,
          currentBalance:
            account.currentBalance == null
              ? null
              : Number(account.currentBalance),
          availableBalance:
            account.availableBalance == null
              ? null
              : Number(account.availableBalance),
          source: String(account.source ?? "manual"),
          connectionStatus: String(account.connectionStatus ?? "not_connected"),
        },
      });
    }
  });
}
