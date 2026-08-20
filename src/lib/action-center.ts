import type { ActionDestinationKey } from "@/lib/action-destinations";
import type { ActionItem } from "@/types/actions";
import type { RecurringSuggestion } from "@/types/actions";
import type {
  Alert,
  Bill,
  PlannedExpense,
  Subscription,
} from "@/types/money";
import { daysUntil } from "@/lib/money-utils";
import { deriveBillPhase } from "@/lib/obligations-lifecycle";
import {
  getBillNextDueDate,
  getSubscriptionNextRenewalDate,
  isBillOccurrencePaid,
  isSubscriptionOccurrenceRenewed,
} from "@/lib/recurrence";

function priorityFromSeverity(severity: Alert["severity"]): ActionItem["priority"] {
  if (severity === "high") return "high";
  if (severity === "medium") return "medium";
  return "low";
}

export function buildActionItems(args: {
  alerts: Alert[];
  bills: Bill[];
  subscriptions: Subscription[];
  spendingLater: PlannedExpense[];
  recurringSuggestions: RecurringSuggestion[];
  dismissedActionIds: string[];
  aiNextAction?: string | null;
}): ActionItem[] {
  const dismissed = new Set(args.dismissedActionIds);
  const items: ActionItem[] = [];

  for (const bill of args.bills) {
    const effectiveDueDate = getBillNextDueDate(bill);
    if (isBillOccurrencePaid(bill, effectiveDueDate)) continue;
    const days = daysUntil(effectiveDueDate);
    const phase = deriveBillPhase(bill, effectiveDueDate);
    if (days < 0 || days <= 7 || phase === "needs_confirmation") {
      const id = `action:pay-bill:${bill.id}`;
      if (dismissed.has(id)) continue;
      items.push({
        id,
        title:
          phase === "needs_confirmation"
            ? `Verify payment: ${bill.name}`
            : days < 0
              ? `Overdue: ${bill.name}`
              : `Pay bill: ${bill.name}`,
        type: "pay_bill",
        priority: days < 0 || days <= 3 || phase === "needs_confirmation" ? "high" : "medium",
        dueDate: effectiveDueDate,
        source: "Bills",
        href: bill.paymentUrl,
        destinationKey: "pay_bill",
        actionLabel: bill.paymentUrl ? "Open payment" : "Review bill",
        dismissible: true,
      });
    }
  }

  for (const sub of args.subscriptions) {
    if (sub.status === "keep") {
      const renewalDate = getSubscriptionNextRenewalDate(sub);
      if (renewalDate && !isSubscriptionOccurrenceRenewed(sub, renewalDate)) {
        const days = daysUntil(renewalDate);
        if (days < 0 || days <= 7) {
          const id = `action:sub-renewal:${sub.id}`;
          if (!dismissed.has(id)) {
            items.push({
              id,
              title:
                days < 0
                  ? `Renewal overdue: ${sub.name}`
                  : `Subscription renewing: ${sub.name}`,
              type: "subscription_review",
              priority: days < 0 || days <= 3 ? "high" : "medium",
              dueDate: renewalDate,
              source: "Subscriptions",
              href: sub.cancellationUrl,
              destinationKey: "subscriptions_review",
              actionLabel: sub.cancellationUrl ? "Cancel/manage" : "Review renewal",
              dismissible: true,
            });
          }
        }
      }
    }
    if (sub.isTrial && sub.trialEndDate) {
      const days = daysUntil(sub.trialEndDate);
      const reminderDays = sub.reminderDaysBeforeTrialEnds ?? 7;
      if (days >= 0 && days <= reminderDays) {
        const id = `action:trial:${sub.id}`;
        if (dismissed.has(id)) continue;
        items.push({
          id,
          title: `Trial ending: ${sub.name}`,
          type: "trial_ending",
          priority: days <= 3 ? "high" : "medium",
          dueDate: sub.trialEndDate,
          source: "Subscriptions",
          href: sub.cancellationUrl,
          destinationKey: "subscriptions_trial",
          actionLabel: sub.cancellationUrl ? "Cancel/manage" : "Review trial",
          dismissible: true,
        });
      }
    }

    if (sub.status === "review") {
      const id = `action:sub-review:${sub.id}`;
      if (dismissed.has(id)) continue;
      items.push({
        id,
        title: `Review subscription: ${sub.name}`,
        type: "subscription_review",
        priority: "medium",
        source: "Subscriptions",
        href: sub.cancellationUrl,
        destinationKey: "subscriptions_review",
        actionLabel: sub.cancellationUrl ? "Cancel/manage" : "Review",
        dismissible: true,
      });
    }
  }

  for (const alert of args.alerts) {
    if (alert.status !== "active" || !alert.reviewRequired) continue;
    const id = `action:alert:${alert.id}`;
    if (dismissed.has(id)) continue;
    items.push({
      id,
      title: alert.title,
      type:
        alert.syncType === "transaction_needs_classification"
          ? "classify_transaction"
          : alert.syncType === "setup_needed"
            ? "setup"
            : alert.syncType === "recurring_candidate_detected"
              ? "recurring_suggestion"
              : "review_alert",
      priority: priorityFromSeverity(alert.severity),
      source: "Alerts",
      destinationKey: destinationKeyForSyncedAlert(alert),
      actionLabel: "Review",
      dismissible: true,
    });
  }

  for (const item of args.spendingLater) {
    if (item.status === "completed" || item.status === "paused") continue;
    const date = item.targetDate ?? item.reminderDate;
    if (!date) continue;
    const days = daysUntil(date);
    if (days >= 0 && days <= 14) {
      const id = `action:spending-later:${item.id}`;
      if (dismissed.has(id)) continue;
      items.push({
        id,
        title: `Spending Later: ${item.title ?? item.name}`,
        type: "spending_later",
        priority: item.priority === "high" ? "high" : "medium",
        dueDate: date,
        source: "Spending Later",
        destinationKey: "spending_later",
        actionLabel: "Review",
        dismissible: true,
      });
    }
  }

  for (const suggestion of args.recurringSuggestions.slice(0, 5)) {
    const id = `action:recurring:${suggestion.id}`;
    if (dismissed.has(id)) continue;
    items.push({
      id,
      title: `Detected recurring: ${suggestion.name}`,
      type: "recurring_suggestion",
      priority:
        suggestion.confidence === "high"
          ? "medium"
          : suggestion.confidence === "medium"
            ? "medium"
            : "low",
      source: "Transactions",
      destinationKey: "recurring_candidates",
      actionLabel: "Review suggestion",
      dismissible: true,
    });
  }

  if (args.aiNextAction) {
    const id = "action:ai-next";
    if (!dismissed.has(id)) {
      items.push({
        id,
        title: args.aiNextAction,
        type: "ai_recommendation",
        priority: "medium",
        source: "AI Brief",
        destinationKey: "ai_recommendation",
        actionLabel: "Review guidance",
        dismissible: true,
      });
    }
  }

  const rank = { high: 0, medium: 1, low: 2 };
  return items.sort((a, b) => {
    const pa = rank[a.priority];
    const pb = rank[b.priority];
    if (pa !== pb) return pa - pb;
    if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
    if (a.dueDate) return -1;
    if (b.dueDate) return 1;
    return a.title.localeCompare(b.title);
  });
}

function destinationKeyForSyncedAlert(alert: Alert): ActionDestinationKey {
  switch (alert.syncType) {
    case "transaction_needs_classification":
      return "classify_transactions";
    case "recurring_candidate_detected":
      return "recurring_candidates";
    case "bill_due_soon":
    case "bill_overdue":
    case "variable_bill_review":
    case "low_cash_coverage":
      return "bills_due";
    case "subscription_review":
      return "subscriptions_review";
    case "trial_ending":
      return "subscriptions_trial";
    case "spending_later_due":
      return "spending_later";
    case "setup_needed":
      return "setup_accounts";
    default:
      return "alerts";
  }
}
