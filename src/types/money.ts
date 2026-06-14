// Core MoneyOS domain types. All data is local/mock and editable in-browser
// (persisted to localStorage) — no bank APIs, no auth, no database.

export type Tone = "success" | "info" | "warning" | "danger" | "neutral";

export type AccountType =
  | "checking"
  | "savings"
  | "cash"
  | "credit"
  | "investment"
  | "loan"
  | "other"
  | "external";

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  institution?: string;
  /** Current balance (primary display amount). */
  balance: number;
  availableBalance?: number;
  /** Whether this balance counts toward total cash available. */
  accessible: boolean;
  source?: "manual" | "plaid_sandbox";
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type BillAmountType = "fixed" | "variable" | "estimate";
export type BillFrequency =
  | "monthly"
  | "biweekly"
  | "annual"
  | "one-time"
  | "variable";
export type BillStatus = "unpaid" | "scheduled" | "paid" | "review";

export interface Bill {
  id: string;
  name: string;
  /** null when the amount is unknown/variable. */
  amount: number | null;
  amountType: BillAmountType;
  /** ISO date string (YYYY-MM-DD). */
  dueDate: string;
  nextDueDate?: string;
  frequency: BillFrequency;
  autopay: boolean;
  paidFrom: string;
  status: BillStatus;
  notes?: string;
  paymentUrl?: string;
  paymentMethod?: string;
  paymentInstructions?: string;
  payeeName?: string;
  reminderDaysBeforeDue?: number;
  lastPaidAt?: string;
}

export type IncomeAmountType = "fixed" | "variable" | "commission" | "unknown";
export type IncomeFrequency =
  | "weekly"
  | "biweekly"
  | "monthly"
  | "semester"
  | "annual"
  | "variable"
  | "as-needed";
export type Reliability = "high" | "medium" | "low" | "variable";

export interface IncomeSource {
  id: string;
  source: string;
  /** null when the amount is unknown/variable. */
  expectedAmount: number | null;
  amountType: IncomeAmountType;
  frequency: IncomeFrequency;
  reliability: Reliability;
  active: boolean;
  /** ISO date the income begins (for not-yet-active sources). */
  startDate?: string;
  /** ISO date of the next expected payment (for active, scheduled sources). */
  nextDate?: string;
  notes?: string;
}

export type SubscriptionFrequency = "weekly" | "monthly" | "annual" | "variable";
export type SubscriptionStatus = "keep" | "review" | "cancel";

export interface Subscription {
  id: string;
  name: string;
  amount: number;
  frequency: SubscriptionFrequency;
  category: string;
  status: SubscriptionStatus;
  /** ISO date of the next renewal. */
  renewalDate?: string;
  notes?: string;
  isTrial?: boolean;
  trialStartDate?: string;
  trialEndDate?: string;
  reminderDaysBeforeTrialEnds?: number;
  cancellationUrl?: string;
  reminderEnabled?: boolean;
}

export type AlertSeverity = "low" | "medium" | "high";

export type AlertCategory =
  | "bill"
  | "subscription"
  | "income"
  | "account"
  | "spending"
  | "review";

export type AlertStatus = "active" | "reviewed" | "archived";

export type SyncedAlertType =
  | "bill_due_soon"
  | "bill_overdue"
  | "variable_bill_review"
  | "subscription_review"
  | "trial_ending"
  | "recurring_candidate_detected"
  | "transaction_needs_classification"
  | "spending_later_due"
  | "low_cash_coverage"
  | "setup_needed";

export interface Alert {
  id: string;
  title: string;
  description: string;
  severity: AlertSeverity;
  category: AlertCategory;
  suggestedAction: string;
  reviewRequired: boolean;
  status: AlertStatus;
  /** Deterministic id for synced alerts — prefix sync: */
  syncType?: SyncedAlertType;
  userCreated?: boolean;
  sourceId?: string;
}

export type DashboardStatus =
  | "Stable"
  | "Watch"
  | "Tight"
  | "Danger"
  | "Review Needed"
  | "Setup Needed";

export type PlannedExpensePriority = "low" | "medium" | "high";

export type PlannedExpenseStatus =
  | "planned"
  | "saving"
  | "scheduled"
  | "funded"
  | "completed"
  | "paused";

export interface PlannedExpense {
  id: string;
  /** Display title (legacy field name: name). */
  name: string;
  title?: string;
  /** null = amount not yet known. */
  amount: number | null;
  /** ISO date the money is needed, if known. */
  targetDate?: string;
  category: string;
  status: PlannedExpenseStatus;
  priority?: PlannedExpensePriority;
  notes?: string;
  fundingSource?: string;
  reminderDate?: string;
}

/** Manual, mock financial estimates (not from live accounts). */
export interface FinancialEstimates {
  manual: true;
  monthlyIncomeEstimate: number;
  monthlySpendingEstimate: number;
  note: string;
}
