import type {
  Account,
  Alert,
  Bill,
  IncomeSource,
  PlannedExpense,
  Subscription,
} from "@/types/money";

/** Empty defaults for Start Fresh / local user mode. */
export const EMPTY_USER_NOTICE =
  "No data yet — add bills, income, and subscriptions to build your system.";

export const emptyAccounts: Account[] = [];

export function getEmptyBills(): Bill[] {
  return [];
}

export function getEmptyIncome(): IncomeSource[] {
  return [];
}

export function getEmptySubscriptions(): Subscription[] {
  return [];
}

export const emptyAlerts: Alert[] = [];

export const emptySpendingLater: PlannedExpense[] = [];
