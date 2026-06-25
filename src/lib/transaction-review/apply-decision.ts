import type { Bill, Subscription } from "@/types/money";
import type {
  AppliedReviewDecision,
  TransactionReviewAction,
  TransactionReviewPayload,
} from "@/types/transaction-review";
import {
  billCategoryGuess,
  reviewCategoryToDomain,
  subscriptionCategoryGuess,
} from "@/lib/transaction-review/categories";

export function applyTransactionReviewDecision(args: {
  payload: TransactionReviewPayload;
  bill?: Bill | null;
  subscription?: Subscription | null;
}): AppliedReviewDecision {
  const { payload, bill, subscription } = args;

  if (payload.action === "transfer") {
    const mapped = reviewCategoryToDomain("Transfer / Internal");
    return {
      ...mapped,
      needsReview: false,
      reviewState: "transfer",
      classificationSource: "manual",
      linkedBillId: null,
      linkedSubscriptionId: null,
      isTransferInternal: true,
      isRefund: false,
      isIncomeFlag: false,
      isRecurringExcluded: true,
      recurringReviewState: "not_recurring",
    };
  }

  if (payload.action === "refund") {
    const mapped = reviewCategoryToDomain("Refund");
    return {
      ...mapped,
      needsReview: false,
      reviewState: "refund",
      classificationSource: "manual",
      linkedBillId: null,
      linkedSubscriptionId: null,
      isTransferInternal: false,
      isRefund: true,
      isIncomeFlag: false,
      isRecurringExcluded: false,
      recurringReviewState: "ignored",
    };
  }

  if (payload.action === "income") {
    const mapped = reviewCategoryToDomain("Income");
    return {
      ...mapped,
      needsReview: false,
      reviewState: "income",
      classificationSource: "manual",
      linkedBillId: null,
      linkedSubscriptionId: null,
      isTransferInternal: false,
      isRefund: false,
      isIncomeFlag: true,
      isRecurringExcluded: false,
      recurringReviewState: "ignored",
    };
  }

  if (payload.action === "link_bill" && bill) {
    const reviewCategory = billCategoryGuess(bill.name);
    const mapped = reviewCategoryToDomain(reviewCategory);
    return {
      ...mapped,
      needsReview: false,
      reviewState: "linked_bill",
      classificationSource: "linked_bill",
      linkedBillId: bill.id,
      linkedSubscriptionId: null,
      isTransferInternal: false,
      isRefund: false,
      isIncomeFlag: false,
      isRecurringExcluded: true,
      recurringReviewState: "linked_to_bill",
    };
  }

  if (payload.action === "link_subscription" && subscription) {
    const reviewCategory = subscriptionCategoryGuess(subscription.name);
    const mapped = reviewCategoryToDomain(reviewCategory);
    return {
      ...mapped,
      needsReview: false,
      reviewState: "linked_subscription",
      classificationSource: "linked_subscription",
      linkedBillId: null,
      linkedSubscriptionId: subscription.id,
      isTransferInternal: false,
      isRefund: false,
      isIncomeFlag: false,
      isRecurringExcluded: true,
      recurringReviewState: "linked_to_subscription",
    };
  }

  if (payload.action === "not_recurring") {
    const mapped = reviewCategoryToDomain(payload.category ?? "Other / Needs review");
    return {
      ...mapped,
      needsReview: false,
      reviewState: "categorized",
      classificationSource: "manual",
      linkedBillId: null,
      linkedSubscriptionId: null,
      isTransferInternal: false,
      isRefund: false,
      isIncomeFlag: false,
      isRecurringExcluded: true,
      recurringReviewState: "not_recurring",
    };
  }

  if (payload.action === "leave_unresolved") {
    const mapped = reviewCategoryToDomain("Other / Needs review");
    return {
      ...mapped,
      needsReview: true,
      reviewState: "unresolved",
      classificationSource: "manual",
      linkedBillId: null,
      linkedSubscriptionId: null,
      isTransferInternal: false,
      isRefund: false,
      isIncomeFlag: false,
      isRecurringExcluded: false,
      recurringReviewState: "needs_review",
    };
  }

  const category =
    payload.action === "accept_ai"
      ? (payload.aiCategory ?? payload.category ?? "Other / Needs review")
      : (payload.category ?? "Other / Needs review");
  const mapped = reviewCategoryToDomain(category);

  return {
    ...mapped,
    needsReview: false,
    reviewState: "categorized",
    classificationSource:
      payload.action === "accept_ai" ? "ai_accepted" : "manual",
    linkedBillId: null,
    linkedSubscriptionId: null,
    isTransferInternal: false,
    isRefund: false,
    isIncomeFlag: mapped.classification === "income",
    isRecurringExcluded: false,
    recurringReviewState: "ignored",
  };
}

export function isReviewResolved(decision: AppliedReviewDecision): boolean {
  return (
    !decision.needsReview &&
    decision.reviewState !== "unresolved" &&
    decision.reviewState !== "needs_review"
  );
}

export function actionRequiresCategory(action: TransactionReviewAction): boolean {
  return action === "manual_category" || action === "accept_ai";
}

export function mergeReviewDecisionIntoTransaction(
  transaction: import("@/types/transactions").MoneyTransaction,
  decision: AppliedReviewDecision,
): import("@/types/transactions").MoneyTransaction {
  return {
    ...transaction,
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
    reviewedAt: decision.needsReview ? null : new Date().toISOString(),
  };
}
