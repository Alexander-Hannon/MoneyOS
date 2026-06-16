import type { FinancialDataContextValue } from "@/context/FinancialDataProvider";
import type { WeeklyReviewInput } from "@/types/weekly-review";
import {
  bestNextAction,
  firstThreeActionTitles,
} from "@/lib/action-priority";
import { computeDataConfidence } from "@/lib/data-confidence";
import { computeSetupChecklist } from "@/lib/setup-checklist";
import { activeAlerts, billsDueWithin } from "@/lib/money-utils";
import { daysUntil } from "@/lib/money-utils";

function buildModeContext(fd: FinancialDataContextValue): string {
  if (fd.dashboardSummary.setupIncomplete) {
    return "Setup incomplete — add core accounts, income, and bills first.";
  }
  if (fd.effectiveMode === "personal_live") {
    return "Personal live bank data — real financial data, private owner mode.";
  }
  if (fd.effectiveMode === "plaid_sandbox") {
    return "Plaid sandbox data — not live bank data.";
  }
  if (fd.storedMode === "demo") {
    return "Demo data — not your real finances.";
  }
  return "Based on your current MoneyOS data.";
}

export function buildWeeklyReviewInput(
  fd: FinancialDataContextValue,
): WeeklyReviewInput {
  const bills7 = billsDueWithin(fd.bills, 7);
  const bills14 = fd.dashboardSummary.billsDue14;
  const bills30 = billsDueWithin(fd.bills, 30);
  const confidence = computeDataConfidence(fd);
  const checklist = computeSetupChecklist(fd);
  const actions = firstThreeActionTitles(fd);

  const subscriptionsNeedingReview = fd.subscriptions.filter(
    (s) => s.status === "review",
  ).length;
  const trialsEndingSoon = fd.subscriptions.filter((s) => {
    if (!s.isTrial || !s.trialEndDate) return false;
    const days = daysUntil(s.trialEndDate);
    return days >= 0 && days <= 14;
  }).length;
  const spendingLaterDueSoon = fd.spendingLater.filter((item) => {
    if (item.status === "completed" || item.status === "paused") return false;
    const date = item.targetDate ?? item.reminderDate;
    if (!date) return false;
    const days = daysUntil(date);
    return days >= 0 && days <= 14;
  }).length;

  return {
    appMode: fd.effectiveMode,
    modeContext: buildModeContext(fd),
    dataSource: fd.dataSourceBadge,
    dataConfidence: confidence.level,
    status: fd.dashboardSummary.status,
    cashAvailable: fd.dashboardSummary.cashAvailable,
    billsDue7: bills7.total,
    billsDue7Count: bills7.count,
    billsDue14: bills14.total,
    billsDue14Count: bills14.count,
    billsDue30: bills30.total,
    billsDue30Count: bills30.count,
    incomeExpected14: fd.dashboardSummary.income14.total,
    monthlyRecurring: fd.dashboardSummary.monthlyRecurring,
    reviewItemCount: fd.syncedReviewCount,
    subscriptionsNeedingReview,
    trialsEndingSoon,
    spendingLaterDueSoon,
    firstThreeActions: actions,
    bestNextAction: bestNextAction(fd),
    activeAlerts: activeAlerts(fd.alerts).slice(0, 8).map((a) => ({
      title: a.title,
      severity: a.severity,
    })),
    setupProgress: {
      complete: checklist.completeCount,
      total: checklist.totalCount,
      readyForWeeklyUse: checklist.readyForWeeklyUse,
    },
  };
}

export function getWeekStartDate(date = new Date()): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? 0 : day;
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}
