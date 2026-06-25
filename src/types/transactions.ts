// Phase 4 data model: accounts, transactions, and spending intelligence.
// All data is mock/manual for now. The `source` field tracks provenance so we
// can safely mix mock data today and Plaid sandbox/live data later.

export type DataSource = "manual" | "mock" | "plaid_sandbox" | "plaid_live";

export type PlaidConnectionStatus =
  | "not_connected"
  | "connecting"
  | "connected"
  | "error"
  | "reauth_required";

export type LinkedAccountType =
  | "checking"
  | "savings"
  | "credit"
  | "investment"
  | "loan"
  | "cash"
  | "other";

export interface LinkedAccount {
  id: string;
  name: string;
  institution: string;
  type: LinkedAccountType;
  subtype?: string;
  mask?: string;
  currentBalance?: number;
  availableBalance?: number;
  source: DataSource;
  connectionStatus: PlaidConnectionStatus;
}

export type TransactionType =
  | "debit"
  | "credit"
  | "transfer"
  | "payment"
  | "fee"
  | "income"
  | "refund";

/** Normalized transaction bucket for spending/income/review logic. */
export type TransactionClassification =
  | "spending"
  | "income"
  | "transfer"
  | "credit_card_payment"
  | "loan_payment"
  | "investment"
  | "refund"
  | "fee"
  | "review";

/** High-level spending buckets used across the spending dashboard. */
export type TransactionCategory =
  | "Food"
  | "Gas"
  | "Fitness"
  | "Convenience / Shopping"
  | "Business / Productivity"
  | "Tech"
  | "Bills"
  | "Income"
  | "Transfer"
  | "Review"
  | "Other";

export interface Merchant {
  id: string;
  name: string;
  category: TransactionCategory;
}

export interface MoneyTransaction {
  id: string;
  accountId: string;
  /** ISO date string (YYYY-MM-DD). */
  date: string;
  merchantName: string;
  description: string;
  /** Positive = money in, negative = money out. */
  amount: number;
  type: TransactionType;
  /** Normalized bucket — drives spending/income/review totals. */
  classification: TransactionClassification;
  category: TransactionCategory;
  subcategory?: string;
  pending: boolean;
  source: DataSource;
  needsReview: boolean;
  notes?: string;
  userConfirmedCategory?: string | null;
  reviewState?: import("@/types/transaction-review").TransactionReviewState;
  classificationSource?:
    | import("@/types/transaction-review").ClassificationSource
    | null;
  linkedBillId?: string | null;
  linkedSubscriptionId?: string | null;
  plaidCategoryPrimary?: string | null;
  plaidCategoryDetailed?: string | null;
  isTransferInternal?: boolean;
  isRefund?: boolean;
  isIncomeFlag?: boolean;
  isRecurringExcluded?: boolean;
  recurringReviewState?:
    | import("@/types/transaction-review").RecurringReviewState
    | null;
  reviewedAt?: string | null;
}

export interface TransactionSyncState {
  lastSyncedAt: string | null;
  /** Plaid `transactions/sync` cursor (server-side only when real). */
  cursor: string | null;
  source: DataSource;
  status: "idle" | "syncing" | "error";
}

export type SpendingAlertType =
  | "needs_review"
  | "subscription_detected"
  | "spending_spike"
  | "large_bill"
  | "transfer_detected"
  | "possible_duplicate";

export interface SpendingAlert {
  id: string;
  type: SpendingAlertType;
  severity: "low" | "medium" | "high";
  title: string;
  description: string;
  transactionId?: string;
  amount?: number;
}
