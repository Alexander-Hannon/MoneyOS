import type { FinancialDataContextValue } from "@/context/FinancialDataProvider";
import type { MoneyBriefInput } from "@/lib/ai/types";
import { canGenerateUsefulBrief } from "@/lib/app-mode";
import { activeAlerts } from "@/lib/money-utils";
import { spendingByCategory } from "@/lib/transaction-utils";

function buildModeContext(fd: FinancialDataContextValue): string {
  if (fd.effectiveMode === "future_plaid_live") {
    return "Live mode is disabled in this build.";
  }
  if (fd.isManualEmpty && !fd.plaidConnected) {
    return "Empty state — add bills, income, or connect accounts to generate a useful brief.";
  }
  if (fd.effectiveMode === "plaid_sandbox") {
    return "Plaid sandbox data — not live bank data.";
  }
  if (fd.storedMode === "demo") {
    return "This is demo data.";
  }
  return "This is based on your local manual data.";
}

/** Build a sanitized payload for /api/ai/money-brief — client-side helper. */
export function buildMoneyBriefInput(
  fd: FinancialDataContextValue,
): MoneyBriefInput {
  const { dashboardSummary, spendingSummary } = fd;
  const topCategories = spendingByCategory(fd.transactions)
    .slice(0, 5)
    .map((c) => ({ category: c.category, total: c.total }));

  const upcomingObligations = dashboardSummary.billsDue14.items
    .slice(0, 5)
    .map((b) => `${b.name}${b.amount != null ? ` ($${b.amount})` : ""} due ${b.dueDate}`);

  return {
    appMode: fd.effectiveMode,
    modeContext: buildModeContext(fd),
    dataSource: fd.dataSourceBadge,
    cashAvailable: dashboardSummary.cashAvailable,
    billsDue14Days: dashboardSummary.billsDue14.total,
    billsDue14Count: dashboardSummary.billsDue14.count,
    incomeExpected14Days: dashboardSummary.income14.total,
    monthlySpending: spendingSummary.monthlySpending,
    monthlyIncome: spendingSummary.monthlyIncome,
    topCategories,
    reviewItemsCount:
      dashboardSummary.manualReviewItems +
      dashboardSummary.transactionReviewCount,
    recurringChargesCount: spendingSummary.recurringCount,
    upcomingObligations,
    activeAlerts: activeAlerts(fd.alerts).map((a) => ({
      title: a.title,
      severity: a.severity,
      category: a.category,
      reviewRequired: a.reviewRequired,
    })),
  };
}

export function canGenerateBrief(fd: FinancialDataContextValue): boolean {
  return canGenerateUsefulBrief(
    fd.effectiveMode,
    fd.isManualEmpty,
    fd.plaidConnected,
  );
}
