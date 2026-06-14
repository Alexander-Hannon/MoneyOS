import type { FinancialDataContextValue } from "@/context/FinancialDataProvider";
import type { MoneyBriefInput } from "@/lib/ai/types";
import { activeAlerts } from "@/lib/money-utils";
import { spendingByCategory } from "@/lib/transaction-utils";

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
