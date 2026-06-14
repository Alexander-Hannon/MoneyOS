import type { RecurringSuggestion } from "@/types/actions";
import type {
  Account,
  Alert,
  Bill,
  DashboardStatus,
  IncomeSource,
  PlannedExpense,
  Subscription,
  SyncedAlertType,
} from "@/types/money";
import type { MoneyTransaction } from "@/types/transactions";
import {
  billsDueWithin,
  daysUntil,
  expectedIncomeWithin,
} from "@/lib/money-utils";
import { transactionsNeedingReview } from "@/lib/transaction-utils";

export function syncedAlertId(type: SyncedAlertType, sourceId: string): string {
  return `sync:${type}:${sourceId}`;
}

function isSyncedAlert(alert: Alert): boolean {
  return alert.id.startsWith("sync:") || Boolean(alert.syncType);
}

function buildSyncedAlert(args: {
  type: SyncedAlertType;
  sourceId: string;
  title: string;
  description: string;
  severity: Alert["severity"];
  category: Alert["category"];
  suggestedAction: string;
  reviewRequired?: boolean;
}): Alert {
  return {
    id: syncedAlertId(args.type, args.sourceId),
    syncType: args.type,
    sourceId: args.sourceId,
    userCreated: false,
    title: args.title,
    description: args.description,
    severity: args.severity,
    category: args.category,
    suggestedAction: args.suggestedAction,
    reviewRequired: args.reviewRequired ?? true,
    status: "active",
  };
}

export function syncAlerts(args: {
  bills: Bill[];
  income: IncomeSource[];
  subscriptions: Subscription[];
  spendingLater: PlannedExpense[];
  accounts: Account[];
  transactions: MoneyTransaction[];
  recurringSuggestions?: RecurringSuggestion[];
  dashboardStatus: DashboardStatus;
  cashAvailable: number;
  existingAlerts: Alert[];
}): Alert[] {
  const statusById = new Map(
    args.existingAlerts
      .filter(isSyncedAlert)
      .map((a) => [a.id, a.status] as const),
  );

  const generated: Alert[] = [];

  for (const bill of args.bills) {
    if (bill.status === "paid") continue;
    const days = daysUntil(bill.dueDate);

    if (days < 0) {
      generated.push(
        buildSyncedAlert({
          type: "bill_overdue",
          sourceId: bill.id,
          title: `Overdue bill: ${bill.name}`,
          description: `${bill.name} was due ${Math.abs(days)} day(s) ago.`,
          severity: "high",
          category: "bill",
          suggestedAction: "Review payment status and pay or reschedule.",
        }),
      );
    } else if (days >= 0 && days <= 7) {
      generated.push(
        buildSyncedAlert({
          type: "bill_due_soon",
          sourceId: bill.id,
          title: `Bill due soon: ${bill.name}`,
          description: `${bill.name} is due in ${days} day(s).`,
          severity: days <= 3 ? "high" : "medium",
          category: "bill",
          suggestedAction: bill.paymentUrl
            ? "Open the payment link and review before paying."
            : "Confirm amount and pay from the intended account.",
        }),
      );
    }

    if (bill.amount === null || bill.amountType === "variable") {
      generated.push(
        buildSyncedAlert({
          type: "variable_bill_review",
          sourceId: bill.id,
          title: `Variable bill review: ${bill.name}`,
          description: `${bill.name} has a variable or unknown amount.`,
          severity: "medium",
          category: "bill",
          suggestedAction: "Confirm the amount before the due date.",
        }),
      );
    }
  }

  for (const sub of args.subscriptions) {
    if (sub.status === "review") {
      generated.push(
        buildSyncedAlert({
          type: "subscription_review",
          sourceId: sub.id,
          title: `Subscription review: ${sub.name}`,
          description: `${sub.name} is marked for review.`,
          severity: "medium",
          category: "subscription",
          suggestedAction: sub.cancellationUrl
            ? "Review usage and open cancel/manage link if needed."
            : "Decide whether to keep, change, or cancel.",
        }),
      );
    }

    if (sub.isTrial && sub.trialEndDate) {
      const days = daysUntil(sub.trialEndDate);
      const reminderDays = sub.reminderDaysBeforeTrialEnds ?? 7;
      if (days >= 0 && days <= reminderDays) {
        generated.push(
          buildSyncedAlert({
            type: "trial_ending",
            sourceId: sub.id,
            title: `Trial ending soon: ${sub.name}`,
            description: `${sub.name} trial ends in ${days} day(s) on ${sub.trialEndDate}.`,
            severity: days <= 3 ? "high" : "medium",
            category: "subscription",
            suggestedAction: sub.cancellationUrl
              ? "Review before renewal and open cancel/manage if needed."
              : "Decide whether to continue before the trial ends.",
          }),
        );
      }
    }
  }

  for (const item of args.spendingLater) {
    if (item.status === "completed" || item.status === "paused") continue;
    const date = item.targetDate ?? item.reminderDate;
    if (!date) continue;
    const days = daysUntil(date);
    if (days >= 0 && days <= 14) {
      generated.push(
        buildSyncedAlert({
          type: "spending_later_due",
          sourceId: item.id,
          title: `Spending Later due: ${item.title ?? item.name}`,
          description: `Planned spending "${item.title ?? item.name}" is coming up in ${days} day(s).`,
          severity: item.priority === "high" ? "high" : "medium",
          category: "spending",
          suggestedAction: "Review funding source and set aside funds if needed.",
        }),
      );
    }
  }

  for (const suggestion of args.recurringSuggestions ?? []) {
    generated.push(
      buildSyncedAlert({
        type: "recurring_candidate_detected",
        sourceId: suggestion.id,
        title: `Recurring detected: ${suggestion.name}`,
        description: `${suggestion.name} — ${suggestion.cadence} at ~$${suggestion.detectedAmount.toFixed(2)} (${suggestion.confidence} confidence).`,
        severity: suggestion.confidence === "high" ? "medium" : "low",
        category: "review",
        suggestedAction: suggestion.suggestedAction,
      }),
    );
  }

  const reviewTxns = transactionsNeedingReview(args.transactions);
  if (reviewTxns.length > 0) {
    generated.push(
      buildSyncedAlert({
        type: "transaction_needs_classification",
        sourceId: "aggregate",
        title: `${reviewTxns.length} transaction(s) need classification`,
        description: "Uncategorized or review transactions affect spending totals.",
        severity: reviewTxns.length >= 5 ? "high" : "medium",
        category: "review",
        suggestedAction: "Review and classify transactions in Spending.",
      }),
    );
  }

  if (args.dashboardStatus === "Setup Needed") {
    generated.push(
      buildSyncedAlert({
        type: "setup_needed",
        sourceId: "dashboard",
        title: "Setup needed",
        description: "Add cash accounts, income, and bills to activate full insights.",
        severity: "low",
        category: "account",
        suggestedAction: "Add manual accounts and your recurring obligations.",
        reviewRequired: false,
      }),
    );
  } else {
    const billsDue = billsDueWithin(args.bills, 14);
    const income14 = expectedIncomeWithin(args.income, 14);
    const runway = args.cashAvailable + income14.total;
    if (
      billsDue.total > 0 &&
      runway < billsDue.total &&
      args.dashboardStatus !== "Stable"
    ) {
      generated.push(
        buildSyncedAlert({
          type: "low_cash_coverage",
          sourceId: "coverage",
          title: "Low cash coverage for upcoming bills",
          description: `Upcoming bills (${billsDue.total}) exceed available cash plus expected income (${runway}).`,
          severity: "high",
          category: "account",
          suggestedAction: "Review bills due and available cash before paying.",
        }),
      );
    }
  }

  const userAlerts = args.existingAlerts.filter((a) => !isSyncedAlert(a));

  const mergedSynced = generated.map((alert) => {
    const prior = statusById.get(alert.id);
    if (prior === "reviewed" || prior === "archived") {
      return { ...alert, status: prior };
    }
    return alert;
  });

  return [...userAlerts, ...mergedSynced];
}

export function countActiveReviewAlerts(alerts: Alert[]): number {
  return alerts.filter(
    (a) => a.status === "active" && a.reviewRequired,
  ).length;
}
