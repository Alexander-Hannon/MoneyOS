import type { FinancialDataContextValue } from "@/context/FinancialDataProvider";

export type DataConfidenceLevel = "High" | "Medium" | "Low" | "Setup Needed";

export type DataConfidenceDetail = {
  level: DataConfidenceLevel;
  cash: "missing" | "manual" | "sandbox" | "database" | "demo" | "mixed";
  income: "missing" | "estimated" | "confirmed";
  bills: "missing" | "manual" | "synced_suggestion";
  subscriptions: "missing" | "manual" | "detected";
  spending: "missing" | "projection" | "transaction_history";
};

export function computeDataConfidence(
  fd: FinancialDataContextValue,
): DataConfidenceDetail {
  const { dashboardSummary, spendingSummary, accounts, income, bills, subscriptions } =
    fd;

  let cash: DataConfidenceDetail["cash"] = "missing";
  if (fd.storedMode === "demo") cash = "demo";
  else if (dashboardSummary.cashDataSource === "mixed") cash = "mixed";
  else if (dashboardSummary.cashDataSource === "plaid_sandbox") cash = "sandbox";
  else if (dashboardSummary.cashDataSource === "manual") cash = "manual";
  else if (accounts.length > 0) cash = "manual";

  let incomeLevel: DataConfidenceDetail["income"] = "missing";
  if (income.some((i) => i.active && i.expectedAmount != null)) {
    incomeLevel = "confirmed";
  } else if (income.some((i) => i.active)) {
    incomeLevel = "estimated";
  } else if (spendingSummary.monthlyIncome > 0 && fd.plaidConnected) {
    incomeLevel = "estimated";
  }

  let billsLevel: DataConfidenceDetail["bills"] = "missing";
  if (bills.length > 0) billsLevel = "manual";

  let subscriptionsLevel: DataConfidenceDetail["subscriptions"] = "missing";
  if (subscriptions.length > 0) subscriptionsLevel = "manual";
  else if (spendingSummary.recurringCount > 0) subscriptionsLevel = "detected";

  let spending: DataConfidenceDetail["spending"] = "missing";
  if (fd.transactions.length > 0) spending = "transaction_history";
  else if (dashboardSummary.expectedMonthlyIncome > 0 || bills.length > 0) {
    spending = "projection";
  }

  let level: DataConfidenceLevel = "Setup Needed";

  if (dashboardSummary.setupIncomplete || cash === "missing") {
    level = "Setup Needed";
  } else if (fd.storedMode === "demo") {
    level = "Low";
  } else if (incomeLevel === "missing" || billsLevel === "missing") {
    level = "Low";
  } else if (
    cash === "sandbox" ||
    incomeLevel === "estimated" ||
    spending === "projection"
  ) {
    level = "Medium";
  } else {
    level = "High";
  }

  if (cash === "missing") level = "Setup Needed";
  if (incomeLevel === "missing" && level === "High") level = "Medium";

  return {
    level,
    cash,
    income: incomeLevel,
    bills: billsLevel,
    subscriptions: subscriptionsLevel,
    spending,
  };
}

export function dataConfidenceLabel(level: DataConfidenceLevel): string {
  return level;
}
