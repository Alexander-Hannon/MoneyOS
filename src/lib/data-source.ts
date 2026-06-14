import type { Account } from "@/types/money";
import type {
  DataSource,
  LinkedAccount,
  MoneyTransaction,
  PlaidConnectionStatus,
} from "@/types/transactions";
import { mockAccounts } from "@/lib/data/mock-accounts";
import { getMockTransactions } from "@/lib/data/mock-transactions";
import {
  billsDueWithin,
  computeDashboardStatus,
  expectedIncomeWithin,
  hasHighSeverityReview,
  monthlyRecurringCost,
  overdueUnpaidCount,
  reviewCount,
  totalCashAvailable,
} from "@/lib/money-utils";
import type { Bill, Alert, IncomeSource, Subscription } from "@/types/money";
import {
  isIncomeTransaction,
  monthlyIncomeTotal,
  monthlySpendingTotal,
  recurringChargeCandidates,
  reviewTotal,
  transactionsNeedingReview,
  transferPaymentTotal,
} from "@/lib/transaction-utils";

export type DataSourceLabel =
  | "Mock / Manual"
  | "Plaid Sandbox"
  | "Mixed manual + sandbox";

export function resolveDataSource(
  plaidConnected: boolean,
): DataSource {
  return plaidConnected ? "plaid_sandbox" : "mock";
}

export function dataSourceLabel(
  plaidConnected: boolean,
): DataSourceLabel {
  return plaidConnected ? "Mixed manual + sandbox" : "Mock / Manual";
}

export function dataSourceBadgeText(
  plaidConnected: boolean,
): string {
  if (plaidConnected) return "Plaid Sandbox";
  return "Mock / Manual";
}

const CASH_LIKE_TYPES = new Set(["checking", "savings", "cash"]);

/** Map Plaid linked accounts to dashboard Account shape (depository/cash only). */
export function linkedAccountsToDashboardAccounts(
  linked: LinkedAccount[],
): Account[] {
  return linked
    .filter((a) => CASH_LIKE_TYPES.has(a.type))
    .map((a) => ({
      id: a.id,
      name: a.name,
      type:
        a.type === "savings"
          ? "savings"
          : a.type === "cash"
            ? "cash"
            : "checking",
      balance: a.availableBalance ?? a.currentBalance ?? 0,
      accessible: true,
      notes: `${a.institution}${a.mask ? ` ••${a.mask}` : ""} · Plaid sandbox`,
    }));
}

export function resolveAccounts(
  plaidConnected: boolean,
  linkedAccounts: LinkedAccount[],
): Account[] {
  if (plaidConnected && linkedAccounts.length > 0) {
    const plaidCash = linkedAccountsToDashboardAccounts(linkedAccounts);
    if (plaidCash.length > 0) return plaidCash;
  }
  return mockAccounts;
}

export function resolveTransactions(
  plaidConnected: boolean,
  plaidTransactions: MoneyTransaction[],
): MoneyTransaction[] {
  return plaidConnected ? plaidTransactions : getMockTransactions();
}

export type IncomeSummary = {
  expected14Days: ReturnType<typeof expectedIncomeWithin>;
  sandboxDetected: boolean;
  sandboxMonthlyTotal: number;
  label: DataSourceLabel;
};

export function computeIncomeSummary(
  income: IncomeSource[],
  plaidConnected: boolean,
  transactions: MoneyTransaction[],
): IncomeSummary {
  const expected14Days = expectedIncomeWithin(income, 14);
  const sandboxMonthlyTotal = monthlyIncomeTotal(transactions);
  const sandboxDetected =
    plaidConnected && transactions.some(isIncomeTransaction);

  return {
    expected14Days,
    sandboxDetected,
    sandboxMonthlyTotal,
    label: plaidConnected ? "Mixed manual + sandbox" : "Mock / Manual",
  };
}

export type SpendingSummary = {
  monthlySpending: number;
  monthlyIncome: number;
  reviewCount: number;
  reviewAmount: number;
  recurringCount: number;
  transferPaymentTotal: number;
  label: DataSourceLabel;
};

export function computeSpendingSummary(
  transactions: MoneyTransaction[],
  plaidConnected: boolean,
): SpendingSummary {
  return {
    monthlySpending: monthlySpendingTotal(transactions),
    monthlyIncome: monthlyIncomeTotal(transactions),
    reviewCount: transactionsNeedingReview(transactions).length,
    reviewAmount: reviewTotal(transactions),
    recurringCount: recurringChargeCandidates(transactions).length,
    transferPaymentTotal: transferPaymentTotal(transactions),
    label: plaidConnected ? "Plaid Sandbox" : "Mock / Manual",
  };
}

export type DashboardSummary = {
  cashAvailable: number;
  accounts: Account[];
  billsDue14: ReturnType<typeof billsDueWithin>;
  income14: ReturnType<typeof expectedIncomeWithin>;
  monthlyRecurring: number;
  manualReviewItems: number;
  transactionReviewCount: number;
  status: ReturnType<typeof computeDashboardStatus>;
  label: DataSourceLabel;
};

export function computeDashboardSummary(args: {
  accounts: Account[];
  bills: Bill[];
  income: IncomeSource[];
  subscriptions: Subscription[];
  alerts: Alert[];
  plaidConnected: boolean;
  transactions: MoneyTransaction[];
}): DashboardSummary {
  const {
    accounts,
    bills,
    income,
    subscriptions,
    alerts,
    plaidConnected,
    transactions,
  } = args;

  const cashAvailable = totalCashAvailable(accounts);
  const billsDue14 = billsDueWithin(bills, 14);
  const income14 = expectedIncomeWithin(income, 14);
  let monthlyRecurring = monthlyRecurringCost(bills, subscriptions);

  if (plaidConnected) {
    const recurringTxns = recurringChargeCandidates(transactions);
    const sandboxRecurring = recurringTxns.reduce(
      (sum, t) => sum + Math.abs(t.amount),
      0,
    );
    monthlyRecurring += sandboxRecurring;
  }

  const manualReviewItems = reviewCount(bills, subscriptions);
  const transactionReviewCount = transactionsNeedingReview(transactions).length;

  const status = computeDashboardStatus({
    cashAvailable,
    billsDue14: billsDue14.total,
    incomeExpected14: income14.total,
    overdueUnpaid: overdueUnpaidCount(bills),
    hasHighSeverityReview:
      hasHighSeverityReview(alerts) ||
      (plaidConnected && transactionReviewCount >= 5),
    reviewItems: manualReviewItems + (transactionReviewCount > 0 ? 1 : 0),
  });

  return {
    cashAvailable,
    accounts,
    billsDue14,
    income14,
    monthlyRecurring,
    manualReviewItems,
    transactionReviewCount,
    status,
    label: plaidConnected ? "Mixed manual + sandbox" : "Mock / Manual",
  };
}

export function formatLastSync(iso: string | null): string {
  if (!iso) return "Never synced";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Unknown";
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function plaidStatusLabel(status: PlaidConnectionStatus): string {
  switch (status) {
    case "connected":
      return "Sandbox connected";
    case "connecting":
      return "Connecting…";
    case "error":
      return "Connection error";
    case "reauth_required":
      return "Re-auth required";
    default:
      return "Not connected";
  }
}
