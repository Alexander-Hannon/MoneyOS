export type RecurringSuggestionType =
  | "bill"
  | "subscription"
  | "income"
  | "transfer"
  | "review";

export type RecurringSuggestionConfidence = "low" | "medium" | "high";

export interface RecurringSuggestion {
  id: string;
  name: string;
  detectedAmount: number;
  cadence: string;
  categoryGuess: string;
  typeGuess: RecurringSuggestionType;
  confidence: RecurringSuggestionConfidence;
  sourceTransactions: string[];
  suggestedAction: string;
}

export type ActionItemType =
  | "pay_bill"
  | "trial_ending"
  | "subscription_review"
  | "classify_transaction"
  | "recurring_suggestion"
  | "spending_later"
  | "setup"
  | "ai_recommendation"
  | "review_alert";

export type ActionPriority = "low" | "medium" | "high";

export interface ActionItem {
  id: string;
  title: string;
  type: ActionItemType;
  priority: ActionPriority;
  dueDate?: string;
  source: string;
  href?: string;
  destinationKey?: import("@/lib/action-destinations").ActionDestinationKey;
  actionLabel: string;
  dismissible: boolean;
}

export interface ConnectedInstitutionDisplay {
  id: string;
  plaidItemId?: string | null;
  institutionName: string;
  accountCount: number;
  status: "connected" | "disconnected" | "error" | "syncing";
  connectedAt: string;
  lastSyncAt: string | null;
  environment?: "sandbox" | "production";
  source: "plaid_sandbox" | "plaid_live";
  lastBalanceRefreshAt?: string | null;
}

export type PlaidStorageMode = "memory" | "database" | "none";
