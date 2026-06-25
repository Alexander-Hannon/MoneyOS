import { getPrisma } from "@/lib/db/prisma";
import type {
  DataSource,
  MoneyTransaction,
} from "@/types/transactions";
import { hashPlaidId } from "@/lib/plaid/plaid-hash";
import type { PlaidEnvironment } from "@/lib/plaid/plaid-env";
import { plaidSourceForEnvironment } from "@/lib/plaid/plaid-env";

export async function listTransactionsForUser(userId: string) {
  const prisma = getPrisma();
  if (!prisma) return [];
  return prisma.moneyTransaction.findMany({
    where: { userId },
    orderBy: { date: "desc" },
    take: 1000,
  });
}

export async function listPlaidTransactionsForUser(
  userId: string,
  environment?: PlaidEnvironment,
) {
  const prisma = getPrisma();
  if (!prisma) return [];

  const sources: DataSource[] = environment
    ? [plaidSourceForEnvironment(environment)]
    : ["plaid_sandbox", "plaid_live"];

  return prisma.moneyTransaction.findMany({
    where: { userId, source: { in: sources } },
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
  userConfirmedCategory?: string | null;
  reviewState?: string | null;
  classificationSource?: string | null;
  linkedBillId?: string | null;
  linkedSubscriptionId?: string | null;
  plaidCategoryPrimary?: string | null;
  plaidCategoryDetailed?: string | null;
  isTransferInternal?: boolean | null;
  isRefund?: boolean | null;
  isIncomeFlag?: boolean | null;
  isRecurringExcluded?: boolean | null;
  recurringReviewState?: string | null;
  reviewedAt?: Date | null;
}): MoneyTransaction {
  return {
    id: row.id,
    accountId: row.accountId ?? "",
    date: row.date.toISOString().slice(0, 10),
    merchantName: row.merchantName ?? row.description,
    description: row.description,
    amount: row.amount,
    type: row.type as MoneyTransaction["type"],
    classification: row.classification as MoneyTransaction["classification"],
    category: row.category as MoneyTransaction["category"],
    subcategory: row.subcategory ?? undefined,
    pending: row.pending,
    source: row.source as MoneyTransaction["source"],
    needsReview: row.needsReview,
    notes: row.notes ?? undefined,
    userConfirmedCategory: row.userConfirmedCategory ?? null,
    reviewState: (row.reviewState as MoneyTransaction["reviewState"]) ?? undefined,
    classificationSource:
      (row.classificationSource as MoneyTransaction["classificationSource"]) ??
      null,
    linkedBillId: row.linkedBillId ?? null,
    linkedSubscriptionId: row.linkedSubscriptionId ?? null,
    plaidCategoryPrimary: row.plaidCategoryPrimary ?? null,
    plaidCategoryDetailed:
      row.plaidCategoryDetailed ?? row.subcategory ?? null,
    isTransferInternal: Boolean(row.isTransferInternal),
    isRefund: Boolean(row.isRefund),
    isIncomeFlag: Boolean(row.isIncomeFlag),
    isRecurringExcluded: Boolean(row.isRecurringExcluded),
    recurringReviewState:
      (row.recurringReviewState as MoneyTransaction["recurringReviewState"]) ??
      null,
    reviewedAt: row.reviewedAt?.toISOString() ?? null,
  };
}

export async function upsertPlaidTransactionsForItem(args: {
  userId: string;
  plaidItemId: string;
  source: DataSource;
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
    plaidCategoryPrimary?: string | null;
    plaidCategoryDetailed?: string | null;
  }>;
}) {
  const prisma = getPrisma();
  if (!prisma) throw new Error("Database is not configured.");

  for (const txn of args.transactions) {
    const plaidTransactionIdHash = hashPlaidId(txn.plaidTransactionId);
    const existing = await prisma.moneyTransaction.findUnique({
      where: {
        userId_plaidTransactionIdHash: {
          userId: args.userId,
          plaidTransactionIdHash,
        },
      },
    });

    const sharedFields = {
      plaidItemId: args.plaidItemId,
      accountId: txn.accountId,
      date: new Date(`${txn.date.slice(0, 10)}T00:00:00`),
      merchantName: txn.merchantName,
      description: txn.description,
      amount: txn.amount,
      pending: txn.pending,
      source: args.source,
      plaidCategoryPrimary: txn.plaidCategoryPrimary ?? null,
      plaidCategoryDetailed: txn.plaidCategoryDetailed ?? txn.subcategory ?? null,
      subcategory: txn.subcategory ?? null,
    };

    if (existing?.reviewedAt) {
      await prisma.moneyTransaction.update({
        where: { id: existing.id },
        data: sharedFields,
      });
      continue;
    }

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
        source: args.source,
        needsReview: txn.needsReview,
        notes: txn.notes ?? null,
        plaidCategoryPrimary: txn.plaidCategoryPrimary ?? null,
        plaidCategoryDetailed: txn.plaidCategoryDetailed ?? txn.subcategory ?? null,
        reviewState: txn.needsReview ? "needs_review" : "categorized",
        classificationSource: "plaid",
      },
      update: {
        ...sharedFields,
        type: txn.type,
        classification: txn.classification,
        category: txn.category,
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
      where: { userId, source: { notIn: ["plaid_sandbox", "plaid_live"] } },
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
