export type BillStatus = "paid" | "scheduled" | "due" | "overdue";
export type IncomeStatus = "received" | "expected" | "late";
export type SubscriptionUsage = "active" | "occasional" | "unused";
export type Cadence = "weekly" | "biweekly" | "monthly" | "yearly";

export type Bill = {
  id: string;
  name: string;
  amount: number;
  dueDate: string; // ISO date
  category: string;
  autopay: boolean;
  status: BillStatus;
};

export type IncomeSource = {
  id: string;
  source: string;
  amount: number;
  cadence: Cadence;
  nextDate: string; // ISO date
  status: IncomeStatus;
  type: "Salary" | "Freelance" | "Investment" | "Other";
};

export type Subscription = {
  id: string;
  name: string;
  amount: number;
  cadence: Cadence;
  category: string;
  nextRenewal: string; // ISO date
  usage: SubscriptionUsage;
  priceIncrease?: number; // recent monthly increase, if any
  trialEndsAt?: string; // ISO date, if currently in a trial
};

export type Account = {
  id: string;
  name: string;
  type: "checking" | "savings";
  balance: number;
};

export type Severity = "critical" | "warning" | "info";

export type AlertKind =
  | "bill-due"
  | "bill-overdue"
  | "trial-ending"
  | "unused-subscription"
  | "price-increase"
  | "subscription-creep"
  | "low-buffer"
  | "all-clear";

export type MoneyAlert = {
  id: string;
  kind: AlertKind;
  severity: Severity;
  title: string;
  description: string;
  amount?: number;
  /** Imperative label for the recommended action, e.g. "Pay rent". */
  action: string;
  /** Higher = more urgent. Drives the "next responsible action". */
  priority: number;
};

export type MoneyOSData = {
  accounts: Account[];
  bills: Bill[];
  income: IncomeSource[];
  subscriptions: Subscription[];
};
