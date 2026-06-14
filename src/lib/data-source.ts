import type { Account } from "@/types/money";
import type { AppMode } from "@/types/app-mode";
import {
  getDataSourceLabel,
  isManualDataEmpty,
  type DataSourceLabel,
} from "@/lib/app-mode";
import { demoAccounts } from "@/lib/data/demo-user-data";
import { getMockTransactions } from "@/lib/data/mock-transactions";
import {
  billsDueWithin,
  computeDashboardStatus,
  expectedIncomeWithin,
  expectedMonthlyIncome,
  hasHighSeverityReview,
  monthlyRecurringCost,
  overdueUnpaidCount,
  reviewCount,
  totalCashAvailable,
} from "@/lib/money-utils";
import type { Bill, Alert, IncomeSource, Subscription } from "@/types/money";
import type {
  DataSource,
  LinkedAccount,
  MoneyTransaction,
  PlaidConnectionStatus,
} from "@/types/transactions";
import {
  isIncomeTransaction,
  monthlyIncomeTotal,
  monthlySpendingTotal,
  recurringChargeCandidates,
  reviewTotal,
  transactionsNeedingReview,
  transferPaymentTotal,
} from "@/lib/transaction-utils";

export type { DataSourceLabel };

export function resolveDataSource(
  plaidConnected: boolean,
  storedMode: AppMode,
): DataSource {
  if (plaidConnected) return "plaid_sandbox";
  if (storedMode === "demo") return "mock";
  return "manual";
}

export function dataSourceBadgeText(
  storedMode: AppMode,
  plaidConnected: boolean,
  manualEmpty: boolean,
): string {
  return getDataSourceLabel(storedMode, plaidConnected, manualEmpty);
}

const CASH_LIKE_TYPES = new Set(["checking", "savings", "cash"]);

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
      institution: a.institution,
      balance: a.currentBalance ?? a.availableBalance ?? 0,
      availableBalance: a.availableBalance,
      accessible: true,
      source: "plaid_sandbox" as const,
      notes: `${a.institution}${a.mask ? ` ••${a.mask}` : ""} · Plaid sandbox`,
    }));
}

export function resolveAccounts(
  plaidConnected: boolean,
  linkedAccounts: LinkedAccount[],
  storedMode: AppMode,
  manualAccounts: Account[] = [],
): Account[] {
  const manual = manualAccounts.map((a) => ({
    ...a,
    source: a.source ?? ("manual" as const),
  }));

  if (plaidConnected && linkedAccounts.length > 0) {
    const plaidCash = linkedAccountsToDashboardAccounts(linkedAccounts);
    if (storedMode === "local_user" && manual.length > 0) {
      return [...manual, ...plaidCash];
    }
    if (plaidCash.length > 0) return plaidCash;
  }
  if (storedMode === "demo") return demoAccounts;
  if (manual.length > 0) return manual;
  return [];
}

export function resolveTransactions(
  plaidConnected: boolean,
  plaidTransactions: MoneyTransaction[],
  storedMode: AppMode,
): MoneyTransaction[] {
  if (plaidConnected) return plaidTransactions;
  if (storedMode === "demo") return getMockTransactions();
  return [];
}

export type IncomeSummary = {
  expected14Days: ReturnType<typeof expectedIncomeWithin>;
  sandboxDetected: boolean;
  sandboxMonthlyTotal: number;
  label: DataSourceLabel;
};

export function computeIncomeSummary(
  income: IncomeSource[],
  storedMode: AppMode,
  plaidConnected: boolean,
  transactions: MoneyTransaction[],
  manualEmpty: boolean,
): IncomeSummary {
  const expected14Days = expectedIncomeWithin(income, 14);
  const sandboxMonthlyTotal = monthlyIncomeTotal(transactions);
  const sandboxDetected =
    plaidConnected && transactions.some(isIncomeTransaction);

  return {
    expected14Days,
    sandboxDetected,
    sandboxMonthlyTotal,
    label: getDataSourceLabel(storedMode, plaidConnected, manualEmpty),
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
  storedMode: AppMode,
  plaidConnected: boolean,
  manualEmpty: boolean,
): SpendingSummary {
  return {
    monthlySpending: monthlySpendingTotal(transactions),
    monthlyIncome: monthlyIncomeTotal(transactions),
    reviewCount: transactionsNeedingReview(transactions).length,
    reviewAmount: reviewTotal(transactions),
    recurringCount: recurringChargeCandidates(transactions).length,
    transferPaymentTotal: transferPaymentTotal(transactions),
    label: getDataSourceLabel(storedMode, plaidConnected, manualEmpty),
  };
}

export type DashboardSummary = {
  cashAvailable: number;
  accounts: Account[];
  billsDue14: ReturnType<typeof billsDueWithin>;
  income14: ReturnType<typeof expectedIncomeWithin>;
  monthlyRecurring: number;
  expectedMonthlyIncome: number;
  manualReviewItems: number;
  transactionReviewCount: number;
  status: ReturnType<typeof computeDashboardSummaryStatus>;
  label: DataSourceLabel;
  isEmpty: boolean;
  setupIncomplete: boolean;
  hasManualAccounts: boolean;
  cashDataSource: "manual" | "plaid_sandbox" | "demo" | "mixed" | "missing";
};

export function computeDashboardSummary(args: {
  accounts: Account[];
  bills: Bill[];
  income: IncomeSource[];
  subscriptions: Subscription[];
  alerts: Alert[];
  storedMode: AppMode;
  plaidConnected: boolean;
  transactions: MoneyTransaction[];
}): DashboardSummary {
  const {
    accounts,
    bills,
    income,
    subscriptions,
    alerts,
    storedMode,
    plaidConnected,
    transactions,
  } = args;

  const manualEmpty = isManualDataEmpty({ bills, income, subscriptions, alerts });
  const hasManualAccounts = accounts.some((a) => a.source === "manual" || !a.source);
  const cashAvailable = totalCashAvailable(accounts);
  const billsDue14 = billsDueWithin(bills, 14);
  const income14 = expectedIncomeWithin(income, 14);
  const monthlyIncomeEstimate = expectedMonthlyIncome(income);
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

  const setupIncomplete =
    !plaidConnected &&
    storedMode !== "demo" &&
    accounts.length === 0 &&
    manualEmpty;

  const cashDataSource: DashboardSummary["cashDataSource"] = plaidConnected
    ? hasManualAccounts
      ? "mixed"
      : "plaid_sandbox"
    : storedMode === "demo"
      ? "demo"
      : accounts.length > 0
        ? "manual"
        : "missing";

  const status = computeDashboardSummaryStatus({
    cashAvailable,
    billsDue14: billsDue14.total,
    incomeExpected14: income14.total,
    overdueUnpaid: overdueUnpaidCount(bills),
    alerts,
    plaidConnected,
    transactionReviewCount,
    manualReviewItems,
    setupIncomplete,
    hasAccounts: accounts.length > 0,
    hasBillsOrIncome:
      bills.length > 0 || income.length > 0 || subscriptions.length > 0,
  });

  return {
    cashAvailable,
    accounts,
    billsDue14,
    income14,
    monthlyRecurring,
    expectedMonthlyIncome: monthlyIncomeEstimate,
    manualReviewItems,
    transactionReviewCount,
    status,
    label: getDataSourceLabel(storedMode, plaidConnected, manualEmpty),
    isEmpty: manualEmpty && !plaidConnected && storedMode !== "demo",
    setupIncomplete,
    hasManualAccounts,
    cashDataSource,
  };
}

function computeDashboardSummaryStatus(args: {
  cashAvailable: number;
  billsDue14: number;
  incomeExpected14: number;
  overdueUnpaid: number;
  alerts: Alert[];
  plaidConnected: boolean;
  transactionReviewCount: number;
  manualReviewItems: number;
  setupIncomplete: boolean;
  hasAccounts: boolean;
  hasBillsOrIncome: boolean;
}) {
  if (args.setupIncomplete) return "Setup Needed" as const;

  if (
    !args.hasAccounts &&
    !args.plaidConnected &&
    args.hasBillsOrIncome &&
    args.cashAvailable === 0
  ) {
    return "Setup Needed" as const;
  }

  if (!args.hasAccounts && !args.plaidConnected && !args.hasBillsOrIncome) {
    return "Setup Needed" as const;
  }

  return computeDashboardStatus({
    cashAvailable: args.cashAvailable,
    billsDue14: args.billsDue14,
    incomeExpected14: args.incomeExpected14,
    overdueUnpaid: args.overdueUnpaid,
    hasHighSeverityReview:
      hasHighSeverityReview(args.alerts) ||
      (args.plaidConnected && args.transactionReviewCount >= 5),
    reviewItems: args.manualReviewItems + (args.transactionReviewCount > 0 ? 1 : 0),
  });
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

// Re-export for callers that need empty check
export { isManualDataEmpty };
