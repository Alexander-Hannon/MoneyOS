import type { Bill, Subscription, Tone } from "@/types/money";
import {
  daysBetween,
  getBillEffectiveDueDate,
  getSubscriptionNextRenewalDate,
  isBillOccurrencePaid,
  isRecurringBill,
  isSubscriptionOccurrenceRenewed,
  resolveAsOfDate,
  toYMD,
} from "@/lib/recurrence";

/** Derived lifecycle phase for a bill or subscription occurrence. */
export type ObligationPhase =
  | "upcoming"
  | "scheduled"
  | "due_today"
  | "overdue"
  | "paid_this_cycle"
  | "needs_confirmation"
  | "inactive";

export type ObligationSection = "active" | "completed";

export type BillOccurrenceView = {
  bill: Bill;
  occurrenceDate: string;
  phase: ObligationPhase;
  section: ObligationSection;
  daysUntil: number;
  displayLabel: string;
};

export type SubscriptionOccurrenceView = {
  subscription: Subscription;
  occurrenceDate: string;
  phase: ObligationPhase;
  section: ObligationSection;
  daysUntil: number;
  displayLabel: string;
};

const PHASE_SORT: Record<ObligationPhase, number> = {
  overdue: 0,
  due_today: 1,
  needs_confirmation: 2,
  scheduled: 3,
  upcoming: 4,
  paid_this_cycle: 5,
  inactive: 6,
};

function isScheduledForOccurrence(
  bill: Bill,
  occurrenceDate: string,
): boolean {
  if (bill.status !== "scheduled") return false;
  const scheduledFor = bill.scheduledForDate?.slice(0, 10);
  if (scheduledFor) return scheduledFor === occurrenceDate.slice(0, 10);
  const effective = getBillEffectiveDueDate(bill);
  return effective === occurrenceDate.slice(0, 10);
}

export function deriveBillPhase(
  bill: Bill,
  occurrenceDate: string,
  asOf?: Date | string,
): ObligationPhase {
  if (bill.status === "review") return "inactive";

  if (isBillOccurrencePaid(bill, occurrenceDate)) {
    return "paid_this_cycle";
  }

  const today = toYMD(resolveAsOfDate(asOf));
  const days = daysBetween(today, occurrenceDate.slice(0, 10));

  if (isScheduledForOccurrence(bill, occurrenceDate)) {
    if (days < 0) return "needs_confirmation";
    return "scheduled";
  }

  if (days < 0) return "overdue";
  if (days === 0) return "due_today";
  return "upcoming";
}

export function deriveSubscriptionPhase(
  subscription: Subscription,
  occurrenceDate: string,
  asOf?: Date | string,
): ObligationPhase {
  if (subscription.status !== "keep") return "inactive";

  if (isSubscriptionOccurrenceRenewed(subscription, occurrenceDate)) {
    return "paid_this_cycle";
  }

  const today = toYMD(resolveAsOfDate(asOf));
  const days = daysBetween(today, occurrenceDate.slice(0, 10));

  if (days < 0) return "overdue";
  if (days === 0) return "due_today";
  return "upcoming";
}

export function phaseDisplayLabel(phase: ObligationPhase): string {
  switch (phase) {
    case "upcoming":
      return "Upcoming";
    case "scheduled":
      return "Scheduled";
    case "due_today":
      return "Due today";
    case "overdue":
      return "Overdue";
    case "paid_this_cycle":
      return "Paid this cycle";
    case "needs_confirmation":
      return "Scheduled — verify payment";
    case "inactive":
      return "Inactive";
  }
}

export function phaseTone(phase: ObligationPhase): Tone {
  switch (phase) {
    case "upcoming":
      return "info";
    case "scheduled":
      return "info";
    case "due_today":
      return "warning";
    case "overdue":
      return "danger";
    case "paid_this_cycle":
      return "success";
    case "needs_confirmation":
      return "warning";
    case "inactive":
      return "neutral";
  }
}

export function partitionBills(
  bills: Bill[],
  asOf?: Date | string,
): { active: BillOccurrenceView[]; completed: BillOccurrenceView[] } {
  const active: BillOccurrenceView[] = [];
  const completed: BillOccurrenceView[] = [];

  for (const bill of bills) {
    if (bill.frequency === "one-time") {
      const occurrenceDate = bill.dueDate.slice(0, 10);
      const phase = deriveBillPhase(bill, occurrenceDate, asOf);
      const view: BillOccurrenceView = {
        bill,
        occurrenceDate,
        phase,
        section: phase === "paid_this_cycle" ? "completed" : "active",
        daysUntil: daysBetween(toYMD(resolveAsOfDate(asOf)), occurrenceDate),
        displayLabel: phaseDisplayLabel(phase),
      };
      if (phase === "paid_this_cycle") completed.push(view);
      else active.push(view);
      continue;
    }

    const effectiveDue = getBillEffectiveDueDate(bill, asOf);
    if (effectiveDue) {
      const phase = deriveBillPhase(bill, effectiveDue, asOf);
      if (phase !== "paid_this_cycle" && phase !== "inactive") {
        active.push({
          bill,
          occurrenceDate: effectiveDue,
          phase,
          section: "active",
          daysUntil: daysBetween(toYMD(resolveAsOfDate(asOf)), effectiveDue),
          displayLabel: phaseDisplayLabel(phase),
        });
      }
    }

    if (bill.lastPaidAt) {
      const paidDate = bill.lastPaidAt.slice(0, 10);
      const nextDue = effectiveDue?.slice(0, 10);
      if (!nextDue || paidDate !== nextDue) {
        completed.push({
          bill,
          occurrenceDate: paidDate,
          phase: "paid_this_cycle",
          section: "completed",
          daysUntil: daysBetween(toYMD(resolveAsOfDate(asOf)), paidDate),
          displayLabel: phaseDisplayLabel("paid_this_cycle"),
        });
      }
    } else if (
      bill.status === "paid" &&
      isRecurringBill(bill) &&
      !bill.lastPaidAt
    ) {
      const anchor = bill.dueDate.slice(0, 10);
      completed.push({
        bill,
        occurrenceDate: anchor,
        phase: "paid_this_cycle",
        section: "completed",
        daysUntil: daysBetween(toYMD(resolveAsOfDate(asOf)), anchor),
        displayLabel: phaseDisplayLabel("paid_this_cycle"),
      });
    }
  }

  active.sort(
    (a, b) =>
      PHASE_SORT[a.phase] - PHASE_SORT[b.phase] ||
      a.daysUntil - b.daysUntil,
  );
  completed.sort((a, b) => b.occurrenceDate.localeCompare(a.occurrenceDate));

  return { active, completed };
}

export function partitionSubscriptions(
  subscriptions: Subscription[],
  asOf?: Date | string,
): {
  active: SubscriptionOccurrenceView[];
  completed: SubscriptionOccurrenceView[];
} {
  const active: SubscriptionOccurrenceView[] = [];
  const completed: SubscriptionOccurrenceView[] = [];

  for (const subscription of subscriptions) {
    if (subscription.status !== "keep") continue;

    const nextRenewal = getSubscriptionNextRenewalDate(subscription, asOf);
    if (nextRenewal) {
      const phase = deriveSubscriptionPhase(subscription, nextRenewal, asOf);
      if (phase !== "paid_this_cycle" && phase !== "inactive") {
        active.push({
          subscription,
          occurrenceDate: nextRenewal,
          phase,
          section: "active",
          daysUntil: daysBetween(toYMD(resolveAsOfDate(asOf)), nextRenewal),
          displayLabel: phaseDisplayLabel(phase),
        });
      }
    }

    if (subscription.lastRenewedAt) {
      const renewedDate = subscription.lastRenewedAt.slice(0, 10);
      const nextDate = nextRenewal?.slice(0, 10);
      if (!nextDate || renewedDate !== nextDate) {
        completed.push({
          subscription,
          occurrenceDate: renewedDate,
          phase: "paid_this_cycle",
          section: "completed",
          daysUntil: daysBetween(toYMD(resolveAsOfDate(asOf)), renewedDate),
          displayLabel: phaseDisplayLabel("paid_this_cycle"),
        });
      }
    }
  }

  active.sort(
    (a, b) =>
      PHASE_SORT[a.phase] - PHASE_SORT[b.phase] ||
      a.daysUntil - b.daysUntil,
  );
  completed.sort((a, b) => b.occurrenceDate.localeCompare(a.occurrenceDate));

  return { active, completed };
}

/** Active bills only — used by dashboard windows for single source of truth. */
export function getActiveBillOccurrences(
  bills: Bill[],
  asOf?: Date | string,
): BillOccurrenceView[] {
  return partitionBills(bills, asOf).active;
}

export function getActiveSubscriptionOccurrences(
  subscriptions: Subscription[],
  asOf?: Date | string,
): SubscriptionOccurrenceView[] {
  return partitionSubscriptions(subscriptions, asOf).active;
}
