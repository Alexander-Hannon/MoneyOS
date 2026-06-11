// Core MoneyOS domain types. All data is local/mock — no bank APIs, no DB.

export type Tone = "success" | "info" | "warning" | "danger" | "neutral";

export type AccountType = "checking" | "savings" | "cash" | "external";

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  balance: number;
  /** Whether this balance counts toward "total cash available". */
  accessible: boolean;
  notes?: string;
}

export type BillCadence = "monthly" | "biweekly" | "annual" | "one-time";
export type BillStatus = "scheduled" | "unpaid" | "paid" | "review";

export interface Bill {
  id: string;
  name: string;
  /** null = variable amount. */
  amount: number | null;
  /** true when the amount is an estimate (e.g. ~$300). */
  amountIsEstimate?: boolean;
  /** ISO date string (YYYY-MM-DD). */
  dueDate: string;
  cadence: BillCadence;
  autopay: boolean;
  paidFrom: string;
  status: BillStatus;
  notes?: string;
}

export type IncomeFrequency =
  | "biweekly"
  | "monthly"
  | "semester"
  | "variable"
  | "as-needed";
export type Reliability = "high" | "medium" | "low" | "variable";

export interface IncomeSource {
  id: string;
  source: string;
  /** null = variable amount. */
  expectedAmount: number | null;
  /** Extra context for the amount, e.g. "+ commission". */
  amountNote?: string;
  frequency: IncomeFrequency;
  reliability: Reliability;
  /** Whether the income is flowing now. */
  active: boolean;
  /** ISO date the income begins (for not-yet-active sources). */
  startDate?: string;
  /** ISO date of the next expected payment (for active, scheduled sources). */
  nextDate?: string;
  notes?: string;
}

export type SubscriptionFrequency = "monthly" | "annually";
export type SubscriptionStatus = "keep" | "review" | "cancel";

export interface Subscription {
  id: string;
  name: string;
  amount: number;
  frequency: SubscriptionFrequency;
  category: string;
  status: SubscriptionStatus;
  notes?: string;
}

export type AlertSeverity = "info" | "warning" | "critical";

export interface Alert {
  id: string;
  severity: AlertSeverity;
  title: string;
  description: string;
}

export type DashboardStatus =
  | "Stable"
  | "Watch"
  | "Tight"
  | "Danger"
  | "Review Needed";
