import { getPrisma } from "@/lib/db/prisma";
import { applyTransactionReviewDecision } from "@/lib/transaction-review/apply-decision";
import { createTransactionRuleForUser } from "@/lib/db/transaction-rules";
import type { Bill, Subscription } from "@/types/money";
import type { TransactionReviewPayload } from "@/types/transaction-review";
import { dbTransactionToMoneyTransaction } from "@/lib/db/transactions";
import type { MoneyTransaction } from "@/types/transactions";

export async function getTransactionForUser(userId: string, transactionId: string) {
  const prisma = getPrisma();
  if (!prisma) return null;
  return prisma.moneyTransaction.findFirst({
    where: { id: transactionId, userId },
  });
}

export async function updateTransactionReviewForUser(args: {
  userId: string;
  transactionId: string;
  payload: TransactionReviewPayload;
  bill?: Bill | null;
  subscription?: Subscription | null;
  merchantName: string;
}): Promise<MoneyTransaction> {
  const prisma = getPrisma();
  if (!prisma) throw new Error("Database is not configured.");

  const existing = await getTransactionForUser(args.userId, args.transactionId);
  if (!existing) {
    throw new Error("Transaction not found.");
  }

  const decision = applyTransactionReviewDecision({
    payload: args.payload,
    bill: args.bill,
    subscription: args.subscription,
  });

  const reviewedAt = decision.needsReview ? null : new Date();

  const updated = await prisma.moneyTransaction.update({
    where: { id: existing.id },
    data: {
      category: decision.category,
      classification: decision.classification,
      type: decision.type,
      needsReview: decision.needsReview,
      userConfirmedCategory: decision.userConfirmedCategory,
      reviewState: decision.reviewState,
      classificationSource: decision.classificationSource,
      linkedBillId: decision.linkedBillId,
      linkedSubscriptionId: decision.linkedSubscriptionId,
      isTransferInternal: decision.isTransferInternal,
      isRefund: decision.isRefund,
      isIncomeFlag: decision.isIncomeFlag,
      isRecurringExcluded: decision.isRecurringExcluded,
      recurringReviewState: decision.recurringReviewState,
      reviewedAt,
    },
  });

  if (args.payload.createRule && args.payload.merchantPattern?.trim()) {
    await createTransactionRuleForUser({
      userId: args.userId,
      merchantPattern: args.payload.merchantPattern.trim(),
      category: decision.userConfirmedCategory,
      shouldCountAsSpending: decision.classification === "spending",
      confidenceSource: "user_approved",
    });
  }

  return dbTransactionToMoneyTransaction(updated);
}
