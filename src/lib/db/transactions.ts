import { getPrisma } from "@/lib/db/prisma";
import type {
  MoneyTransaction,
  TransactionClassification,
  TransactionType,
} from "@/types/transactions";
import { hashPlaidId } from "@/lib/plaid/plaid-hash";

export async function listTransactionsForUser(userId: string) {
  const prisma = getPrisma();
  if (!prisma) return [];
  return prisma.moneyTransaction.findMany({
    where: { userId },
    orderBy: { date: "desc" },
    take: 1000,
  });
}

export async function listPlaidTransactionsForUser(userId: string) {
  const prisma = getPrisma();
  if (!prisma) return [];
  return prisma.moneyTransaction.findMany({
    where: { userId, source: "plaid_sandbox" },
    orderBy: { date: "desc" },
    take: 1000,
  });
}

export function dbTransactionToMoneyTransaction(row: {
  id: string;
  accountId: string | null;
  date: Date;
  merchantName: string | null;
  description: string;
  amount: number;
  type: string;
  classification: string;
  category: string;
  subcategory: string | null;
  pending: boolean;
  source: string;
  needsReview: boolean;
  notes: string | null;
}): MoneyTransaction {
  return {
    id: row.id,
    accountId: row.accountId ?? "",
    date: row.date.toISOString().slice(0, 10),
    merchantName: row.merchantName ?? row.description,
    description: row.description,
    amount: row.amount,
    type: row.type as TransactionType,
    classification: row.classification as TransactionClassification,
    category: row.category as MoneyTransaction["category"],
    subcategory: row.subcategory ?? undefined,
    pending: row.pending,
    source: row.source as MoneyTransaction["source"],
    needsReview: row.needsReview,
    notes: row.notes ?? undefined,
  };
}

export async function upsertPlaidTransactionsForItem(args: {
  userId: string;
  plaidItemId: string;
  transactions: Array<{
    plaidTransactionId: string;
    accountId: string;
    date: string;
    merchantName: string;
    description: string;
    amount: number;
    type: string;
    classification: string;
    category: string;
    subcategory?: string;
    pending: boolean;
    needsReview: boolean;
    notes?: string;
  }>;
}) {
  const prisma = getPrisma();
  if (!prisma) throw new Error("Database is not configured.");

  for (const txn of args.transactions) {
    const plaidTransactionIdHash = hashPlaidId(txn.plaidTransactionId);
    await prisma.moneyTransaction.upsert({
      where: {
        userId_plaidTransactionIdHash: {
          userId: args.userId,
          plaidTransactionIdHash,
        },
      },
      create: {
        userId: args.userId,
        plaidItemId: args.plaidItemId,
        plaidTransactionId: txn.plaidTransactionId,
        plaidTransactionIdHash,
        accountId: txn.accountId,
        date: new Date(`${txn.date.slice(0, 10)}T00:00:00`),
        merchantName: txn.merchantName,
        description: txn.description,
        amount: txn.amount,
        type: txn.type,
        classification: txn.classification,
        category: txn.category,
        subcategory: txn.subcategory ?? null,
        pending: txn.pending,
        source: "plaid_sandbox",
        needsReview: txn.needsReview,
        notes: txn.notes ?? null,
      },
      update: {
        plaidItemId: args.plaidItemId,
        accountId: txn.accountId,
        date: new Date(`${txn.date.slice(0, 10)}T00:00:00`),
        merchantName: txn.merchantName,
        description: txn.description,
        amount: txn.amount,
        type: txn.type,
        classification: txn.classification,
        category: txn.category,
        subcategory: txn.subcategory ?? null,
        pending: txn.pending,
        source: "plaid_sandbox",
        needsReview: txn.needsReview,
        notes: txn.notes ?? null,
      },
    });
  }
}

export async function removePlaidTransactionsByPlaidIds(args: {
  userId: string;
  plaidTransactionIds: string[];
}) {
  const prisma = getPrisma();
  if (!prisma || args.plaidTransactionIds.length === 0) return;

  const hashes = args.plaidTransactionIds.map(hashPlaidId);
  await prisma.moneyTransaction.deleteMany({
    where: {
      userId: args.userId,
      plaidTransactionIdHash: { in: hashes },
    },
  });
}

/** Phase 9 scaffold kept for manual migration flows. */
export async function replaceTransactionsForUser(
  userId: string,
  transactions: Record<string, unknown>[],
) {
  const prisma = getPrisma();
  if (!prisma) throw new Error("Database is not configured.");

  await prisma.$transaction(async (tx) => {
    await tx.moneyTransaction.deleteMany({
      where: { userId, source: { not: "plaid_sandbox" } },
    });
    for (const txn of transactions) {
      await tx.moneyTransaction.create({
        data: {
          id: txn.id ? String(txn.id) : undefined,
          userId,
          plaidTransactionIdHash: txn.plaidTransactionIdHash
            ? String(txn.plaidTransactionIdHash)
            : null,
          accountId: txn.accountId ? String(txn.accountId) : null,
          date: new Date(String(txn.date ?? new Date().toISOString())),
          merchantName: txn.merchantName ? String(txn.merchantName) : null,
          description: String(txn.description ?? ""),
          amount: Number(txn.amount) || 0,
          type: String(txn.type ?? "debit"),
          classification: String(txn.classification ?? "review"),
          category: String(txn.category ?? "Review"),
          subcategory: txn.subcategory ? String(txn.subcategory) : null,
          pending: Boolean(txn.pending),
          source: String(txn.source ?? "manual"),
          needsReview: Boolean(txn.needsReview),
          notes: txn.notes ? String(txn.notes) : null,
        },
      });
    }
  });
}
