import { getPrisma } from "@/lib/db/prisma";

export async function listTransactionsForUser(userId: string) {
  const prisma = getPrisma();
  if (!prisma) return [];
  return prisma.moneyTransaction.findMany({
    where: { userId },
    orderBy: { date: "desc" },
    take: 500,
  });
}

/** Phase 9: Plaid sandbox transactions stay ephemeral — scaffold only. */
export async function replaceTransactionsForUser(
  userId: string,
  transactions: Record<string, unknown>[],
) {
  const prisma = getPrisma();
  if (!prisma) throw new Error("Database is not configured.");

  await prisma.$transaction(async (tx) => {
    await tx.moneyTransaction.deleteMany({ where: { userId } });
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
