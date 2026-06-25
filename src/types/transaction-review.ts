import type {
  TransactionClassification,
  TransactionCategory,
} from "@/types/transactions";

export const REVIEW_CATEGORIES = [
  "Food / Dining",
  "Groceries",
  "Gas / Transport",
  "Housing",
  "Utilities",
  "Internet / Phone",
  "School",
  "Business / Productivity",
  "Shopping",
  "Health / Fitness",
  "Entertainment",
  "Travel",
  "Gifts",
  "Income",
  "Refund",
  "Transfer / Internal",
  "Credit Card Payment",
  "Other / Needs review",
] as const;

export type ReviewCategory = (typeof REVIEW_CATEGORIES)[number];

export type TransactionReviewState =
  | "needs_review"
  | "categorized"
  | "linked_bill"
  | "linked_subscription"
  | "transfer"
  | "refund"
  | "income"
  | "ignored"
  | "unresolved";

export type ClassificationSource =
  | "manual"
  | "ai_accepted"
  | "plaid"
  | "linked_bill"
  | "linked_subscription"
  | "rule";

export type RecurringReviewState =
  | "detected"
  | "linked_to_bill"
  | "linked_to_subscription"
  | "not_recurring"
  | "ignored"
  | "needs_review";

export type TransactionReviewAction =
  | "manual_category"
  | "accept_ai"
  | "transfer"
  | "refund"
  | "income"
  | "link_bill"
  | "link_subscription"
  | "not_recurring"
  | "leave_unresolved";

export type TransactionReviewPayload = {
  action: TransactionReviewAction;
  category?: ReviewCategory | string;
  linkedBillId?: string;
  linkedSubscriptionId?: string;
  aiCategory?: string;
  aiReason?: string;
  createRule?: boolean;
  merchantPattern?: string;
};

export type TransactionReviewMeta = {
  userConfirmedCategory?: string | null;
  reviewState?: TransactionReviewState;
  classificationSource?: ClassificationSource | null;
  linkedBillId?: string | null;
  linkedSubscriptionId?: string | null;
  plaidCategoryPrimary?: string | null;
  plaidCategoryDetailed?: string | null;
  isTransferInternal?: boolean;
  isRefund?: boolean;
  isIncomeFlag?: boolean;
  isRecurringExcluded?: boolean;
  recurringReviewState?: RecurringReviewState | null;
  reviewedAt?: string | null;
};

export type AppliedReviewDecision = {
  category: TransactionCategory;
  userConfirmedCategory: string;
  classification: TransactionClassification;
  type: import("@/types/transactions").TransactionType;
  needsReview: boolean;
  reviewState: TransactionReviewState;
  classificationSource: ClassificationSource;
  linkedBillId: string | null;
  linkedSubscriptionId: string | null;
  isTransferInternal: boolean;
  isRefund: boolean;
  isIncomeFlag: boolean;
  isRecurringExcluded: boolean;
  recurringReviewState: RecurringReviewState | null;
};
