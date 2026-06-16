import type { FinancialDataContextValue } from "@/context/FinancialDataProvider";
import { buildActionItems } from "@/lib/action-center";
import { computeSetupChecklist } from "@/lib/setup-checklist";
import { computeDataConfidence } from "@/lib/data-confidence";
import { daysUntil, nextResponsibleAction } from "@/lib/money-utils";

export type PrioritizedAction = {
  id: string;
  title: string;
  reason: string;
  priority: "high" | "medium" | "low";
};

function setupActions(fd: FinancialDataContextValue): PrioritizedAction[] {
  const checklist = computeSetupChecklist(fd);
  const actions: PrioritizedAction[] = [];

  if (!checklist.items.find((i) => i.id === "accounts")?.complete) {
    actions.push({
      id: "setup-accounts",
      title: "Add cash, checking, or savings accounts",
      reason: "Cash visibility is required for weekly review confidence.",
      priority: "high",
    });
  }
  if (!checklist.items.find((i) => i.id === "income")?.complete) {
    actions.push({
      id: "setup-income",
      title: "Add at least one income source",
      reason: "Income timing drives responsible bill decisions.",
      priority: "high",
    });
  }
  if (!checklist.items.find((i) => i.id === "bills")?.complete) {
    actions.push({
      id: "setup-bills",
      title: "Add bills or mark bills review as skipped",
      reason: "Upcoming obligations must be visible.",
      priority: "high",
    });
  }
  if (!checklist.items.find((i) => i.id === "subscriptions")?.complete) {
    actions.push({
      id: "setup-subscriptions",
      title: "Review subscriptions or mark as skipped",
      reason: "Recurring charges affect monthly runway.",
      priority: "medium",
    });
  }
  if (!checklist.items.find((i) => i.id === "weekly_review")?.complete) {
    actions.push({
      id: "setup-weekly-review",
      title: "Run your first Weekly Money Review",
      reason: "Establishes your Sunday review habit.",
      priority: "medium",
    });
  }

  return actions;
}

export function generateFirstThreeActions(
  fd: FinancialDataContextValue,
): PrioritizedAction[] {
  const confidence = computeDataConfidence(fd);
  const setup = setupActions(fd);

  if (confidence.level === "Setup Needed" && setup.length > 0) {
    return setup.slice(0, 3);
  }

  const actionItems = buildActionItems({
    alerts: fd.alerts,
    bills: fd.bills,
    subscriptions: fd.subscriptions,
    spendingLater: fd.spendingLater,
    recurringSuggestions: fd.recurringSuggestions,
    dismissedActionIds: [],
  });

  const prioritized: PrioritizedAction[] = actionItems.map((item) => ({
    id: item.id,
    title: item.title,
    reason: item.source,
    priority: item.priority,
  }));

  if (prioritized.length >= 3) {
    return prioritized.slice(0, 3);
  }

  const topAlert = nextResponsibleAction(fd.alerts);
  if (topAlert && !prioritized.some((a) => a.title === topAlert.title)) {
    prioritized.push({
      id: `alert:${topAlert.id}`,
      title: topAlert.title,
      reason: topAlert.suggestedAction || "Highest-priority alert",
      priority: topAlert.severity === "high" ? "high" : "medium",
    });
  }

  for (const sub of fd.subscriptions) {
    if (sub.isTrial && sub.trialEndDate) {
      const days = daysUntil(sub.trialEndDate);
      if (days >= 0 && days <= 7) {
        prioritized.push({
          id: `trial:${sub.id}`,
          title: `Trial ending soon: ${sub.name}`,
          reason: "Cancel or keep before charge hits.",
          priority: days <= 3 ? "high" : "medium",
        });
      }
    }
  }

  for (const item of fd.spendingLater) {
    if (item.status === "completed" || item.status === "paused") continue;
    const date = item.targetDate ?? item.reminderDate;
    if (!date) continue;
    const days = daysUntil(date);
    if (days >= 0 && days <= 14 && item.priority === "high") {
      prioritized.push({
        id: `spending-later:${item.id}`,
        title: `Spending Later due soon: ${item.title ?? item.name}`,
        reason: "High-priority planned expense approaching.",
        priority: "medium",
      });
    }
  }

  if (prioritized.length === 0) {
    return [
      {
        id: "maintain",
        title: "Run next Weekly Money Review on Sunday",
        reason: "System looks stable — keep the weekly habit.",
        priority: "low",
      },
      {
        id: "maintain-2",
        title: "Maintain your MoneyOS setup",
        reason: "Refresh bills and subscriptions if anything changed.",
        priority: "low",
      },
      {
        id: "maintain-3",
        title: "Review Action Center for new items",
        reason: "Quick scan keeps surprises small.",
        priority: "low",
      },
    ];
  }

  const rank = { high: 0, medium: 1, low: 2 };
  return [...prioritized]
    .sort((a, b) => rank[a.priority] - rank[b.priority])
    .slice(0, 3);
}

export function firstThreeActionTitles(fd: FinancialDataContextValue): string[] {
  return generateFirstThreeActions(fd).map((a) => a.title);
}

export function bestNextAction(fd: FinancialDataContextValue): string {
  const actions = generateFirstThreeActions(fd);
  return actions[0]?.title ?? "Run Weekly Money Review";
}
