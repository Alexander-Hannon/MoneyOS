import type { AppMode } from "@/types/app-mode";
import type { Bill, IncomeSource, Subscription } from "@/types/money";
import type { MoneyTransaction } from "@/types/transactions";
import {
  expectedMonthlyIncome as sumExpectedMonthlyIncome,
  monthlyRecurringCost,
} from "@/lib/money-utils";

export type ChartDataSource =
  | "none"
  | "demo"
  | "plaid_sandbox"
  | "manual_projection"
  | "live";

export type ChartPresentation =
  | "historical_trend"
  | "empty_state"
  | "manual_projection"
  | "live_placeholder";

/** True only when real dated transaction history exists for charting. */
export function hasHistoricalTransactionData(
  transactions: MoneyTransaction[],
  mode: AppMode,
  plaidConnected: boolean,
): boolean {
  if (mode === "personal_live") {
    return transactions.some((t) => t.source === "plaid_live");
  }
  if (plaidConnected || mode === "plaid_sandbox") {
    return transactions.length > 0;
  }
  if (mode === "demo") {
    return transactions.length > 0;
  }
  // local_user: only manual dated transactions (future — none in Phase 9.1)
  return false;
}

export function resolveChartDataSource(args: {
  storedMode: AppMode;
  plaidConnected: boolean;
  transactions: MoneyTransaction[];
  hasManualIncomeOrBills: boolean;
}): ChartDataSource {
  const { storedMode, plaidConnected, transactions, hasManualIncomeOrBills } =
    args;

  if (storedMode === "personal_live") {
    return transactions.some((t) => t.source === "plaid_live")
      ? "live"
      : "none";
  }
  if (plaidConnected && transactions.some((t) => t.source === "plaid_live")) {
    return "live";
  }
  if (plaidConnected && transactions.length > 0) return "plaid_sandbox";
  if (storedMode === "demo" && transactions.length > 0) return "demo";
  if (
    storedMode === "local_user" &&
    hasManualIncomeOrBills &&
    transactions.length === 0
  ) {
    return "manual_projection";
  }
  return "none";
}

export function resolveChartPresentation(args: {
  chartDataSource: ChartDataSource;
  hasHistorical: boolean;
}): ChartPresentation {
  if (args.hasHistorical) return "historical_trend";
  if (args.chartDataSource === "manual_projection") return "manual_projection";
  if (args.chartDataSource === "live") return "live_placeholder";
  return "empty_state";
}

export type ManualMonthlyProjection = {
  expectedMonthlyIncome: number;
  expectedMonthlyObligations: number;
  projectedSurplus: number;
  incomeSourceCount: number;
  billCount: number;
  subscriptionCount: number;
};

export function computeManualMonthlyProjection(args: {
  income: IncomeSource[];
  bills: Bill[];
  subscriptions: Subscription[];
}): ManualMonthlyProjection {
  const expectedMonthlyIncomeValue = sumExpectedMonthlyIncome(args.income);
  const expectedMonthlyObligations = monthlyRecurringCost(
    args.bills,
    args.subscriptions,
  );

  return {
    expectedMonthlyIncome: expectedMonthlyIncomeValue,
    expectedMonthlyObligations,
    projectedSurplus: expectedMonthlyIncomeValue - expectedMonthlyObligations,
    incomeSourceCount: args.income.filter((i) => i.active).length,
    billCount: args.bills.length,
    subscriptionCount: args.subscriptions.length,
  };
}

export function chartSourceLabel(source: ChartDataSource): string {
  switch (source) {
    case "demo":
      return "Demo trend — sample data only.";
    case "plaid_sandbox":
      return "Plaid sandbox transaction history — not live bank data.";
    case "manual_projection":
      return "Manual projection — based on manual income and bills, not historical transactions.";
    case "live":
      return "Live transaction history.";
    default:
      return "No cashflow history yet.";
  }
}
