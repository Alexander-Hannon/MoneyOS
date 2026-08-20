import type { Bill, IncomeSource, Subscription } from "@/types/money";

/** Normalize any date-like value to a stable YYYY-MM-DD calendar string. */
export function normalizeCalendarDate(
  value: unknown,
): string | undefined {
  if (value == null) return undefined;
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  const match = trimmed.match(/^(\d{4}-\d{2}-\d{2})/);
  if (!match) return undefined;
  const [, ymd] = match;
  const [year, month, day] = ymd.split("-").map(Number);
  if (!year || month < 1 || month > 12 || day < 1 || day > 31) return undefined;
  return ymd;
}

export function normalizeBillDates(bill: Bill): Bill {
  return {
    ...bill,
    dueDate: normalizeCalendarDate(bill.dueDate) ?? bill.dueDate,
    lastPaidAt: normalizeCalendarDate(bill.lastPaidAt),
    scheduledForDate: normalizeCalendarDate(bill.scheduledForDate),
    nextDueDate: normalizeCalendarDate(bill.nextDueDate),
  };
}

export function normalizeIncomeDates(income: IncomeSource): IncomeSource {
  return {
    ...income,
    startDate: normalizeCalendarDate(income.startDate),
    nextDate: normalizeCalendarDate(income.nextDate),
    lastReceivedAt: normalizeCalendarDate(income.lastReceivedAt),
  };
}

export function normalizeSubscriptionDates(subscription: Subscription): Subscription {
  return {
    ...subscription,
    renewalDate: normalizeCalendarDate(subscription.renewalDate),
    lastRenewedAt: normalizeCalendarDate(subscription.lastRenewedAt),
    trialStartDate: normalizeCalendarDate(subscription.trialStartDate),
    trialEndDate: normalizeCalendarDate(subscription.trialEndDate),
  };
}

export function normalizeFinancialDataBundle<T extends {
  bills?: Bill[];
  income?: IncomeSource[];
  subscriptions?: Subscription[];
}>(bundle: T): T {
  return {
    ...bundle,
    bills: bundle.bills?.map(normalizeBillDates),
    income: bundle.income?.map(normalizeIncomeDates),
    subscriptions: bundle.subscriptions?.map(normalizeSubscriptionDates),
  };
}
