import type {
  Account,
  Bill,
  DashboardStatus,
  IncomeSource,
  Reliability,
  Subscription,
  Tone,
} from "@/lib/types/money";

const MS_PER_DAY = 1000 * 60 * 60 * 24;

/* ------------------------------------------------------------------ */
/* Dates                                                               */
/* ------------------------------------------------------------------ */

function toYMD(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseYMD(iso: string): Date {
  // Parse as local midnight to avoid timezone drift.
  return new Date(`${iso.slice(0, 10)}T00:00:00`);
}

/** Next calendar occurrence of a given day-of-month (this month or next). */
export function nextMonthlyDate(day: number): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const candidate = new Date(today.getFullYear(), today.getMonth(), day);
  if (candidate < today) candidate.setMonth(candidate.getMonth() + 1);
  return toYMD(candidate);
}

export function daysFromNow(days: number): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + days);
  return toYMD(d);
}

export function daysUntil(iso: string): number {
  const target = parseYMD(iso);
  target.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / MS_PER_DAY);
}

/* ------------------------------------------------------------------ */
/* Monthly-equivalent costs                                            */
/* ------------------------------------------------------------------ */

export function monthlyAmountForBill(bill: Bill): number {
  const amount = bill.amount ?? 0;
  switch (bill.cadence) {
    case "biweekly":
      return (amount * 26) / 12;
    case "annual":
      return amount / 12;
    case "one-time":
      return 0;
    default:
      return amount;
  }
}

export function monthlyAmountForSubscription(sub: Subscription): number {
  return sub.frequency === "annually" ? sub.amount / 12 : sub.amount;
}

/** Total monthly recurring outflow across recurring bills + subscriptions. */
export function monthlyRecurringCost(
  bills: Bill[],
  subscriptions: Subscription[],
): number {
  const billCost = bills.reduce((sum, b) => sum + monthlyAmountForBill(b), 0);
  const subCost = subscriptions.reduce(
    (sum, s) => sum + monthlyAmountForSubscription(s),
    0,
  );
  return billCost + subCost;
}

/* ------------------------------------------------------------------ */
/* Cash, bills due soon, expected income                               */
/* ------------------------------------------------------------------ */

export function totalCashAvailable(accounts: Account[]): number {
  return accounts
    .filter((a) => a.accessible)
    .reduce((sum, a) => sum + a.balance, 0);
}

export type DueWindow = {
  total: number;
  count: number;
  variableCount: number;
  items: Bill[];
};

export function billsDueWithin(bills: Bill[], days: number): DueWindow {
  const items = bills
    .filter((b) => b.status !== "paid")
    .filter((b) => {
      const d = daysUntil(b.dueDate);
      return d >= -7 && d <= days;
    })
    .sort((a, b) => daysUntil(a.dueDate) - daysUntil(b.dueDate));

  return {
    total: items.reduce((sum, b) => sum + (b.amount ?? 0), 0),
    count: items.length,
    variableCount: items.filter((b) => b.amount === null).length,
    items,
  };
}

export type IncomeWindow = { total: number; count: number; items: IncomeSource[] };

export function expectedIncomeWithin(
  income: IncomeSource[],
  days: number,
): IncomeWindow {
  const items = income.filter((i) => {
    if (!i.active || !i.nextDate || i.expectedAmount == null) return false;
    const d = daysUntil(i.nextDate);
    return d >= 0 && d <= days;
  });

  return {
    total: items.reduce((sum, i) => sum + (i.expectedAmount ?? 0), 0),
    count: items.length,
    items,
  };
}

/* ------------------------------------------------------------------ */
/* Dashboard status                                                    */
/* ------------------------------------------------------------------ */

export function reviewCount(
  bills: Bill[],
  subscriptions: Subscription[],
): number {
  return (
    bills.filter((b) => b.status === "review").length +
    subscriptions.filter((s) => s.status === "review").length
  );
}

export function computeDashboardStatus(args: {
  cashAvailable: number;
  billsDue14: number;
  incomeExpected14: number;
  reviewItems: number;
}): DashboardStatus {
  const { cashAvailable, billsDue14, incomeExpected14, reviewItems } = args;
  const net = cashAvailable + incomeExpected14 - billsDue14;

  if (net < 0) return "Danger";
  if (net < 300) return "Tight";
  if (reviewItems > 0) return "Review Needed";
  if (net < 1200) return "Watch";
  return "Stable";
}

export function describeStatus(status: DashboardStatus): string {
  switch (status) {
    case "Stable":
      return "Cash comfortably covers what's coming up.";
    case "Watch":
      return "Healthy, but the buffer is getting thin — keep an eye out.";
    case "Tight":
      return "Upcoming bills nearly use up available cash.";
    case "Danger":
      return "Upcoming bills exceed available cash and expected income.";
    case "Review Needed":
      return "Cash is fine, but flagged items need a decision.";
  }
}

/* ------------------------------------------------------------------ */
/* Next responsible action                                             */
/* ------------------------------------------------------------------ */

export type NextAction = { title: string; detail: string };

export function nextResponsibleAction(bills: Bill[]): NextAction {
  const actionable = bills
    .filter((b) => b.status !== "paid" && !b.autopay)
    .filter((b) => daysUntil(b.dueDate) >= -7)
    .sort((a, b) => daysUntil(a.dueDate) - daysUntil(b.dueDate));

  if (actionable.length > 0) {
    const b = actionable[0];
    const amount =
      b.amount == null
        ? "A variable amount"
        : `${b.amountIsEstimate ? "~" : ""}${formatCurrency(b.amount)}`;
    return {
      title: `Pay ${b.name}`,
      detail: `${amount} is due ${formatDate(b.dueDate)} (${formatRelativeDays(
        daysUntil(b.dueDate),
      )}) via ${b.paidFrom}. Not on autopay, so it needs a manual move.`,
    };
  }

  const review = bills.find((b) => b.status === "review");
  if (review) {
    return {
      title: `Review ${review.name}`,
      detail: review.notes ?? "This bill is flagged for review.",
    };
  }

  return {
    title: "You're caught up",
    detail: "No manual bills are due soon. Keep the system disciplined.",
  };
}

/* ------------------------------------------------------------------ */
/* Tone mappers (for StatusBadge)                                      */
/* ------------------------------------------------------------------ */

export function toneForDashboardStatus(status: DashboardStatus): Tone {
  switch (status) {
    case "Stable":
      return "success";
    case "Watch":
      return "info";
    case "Tight":
      return "warning";
    case "Danger":
      return "danger";
    case "Review Needed":
      return "warning";
  }
}

export function toneForBillStatus(status: Bill["status"]): Tone {
  switch (status) {
    case "paid":
      return "success";
    case "scheduled":
      return "info";
    case "unpaid":
      return "warning";
    case "review":
      return "danger";
  }
}

export function toneForReliability(reliability: Reliability): Tone {
  switch (reliability) {
    case "high":
      return "success";
    case "medium":
      return "info";
    case "low":
      return "warning";
    case "variable":
      return "neutral";
  }
}

export function toneForSubscriptionStatus(status: Subscription["status"]): Tone {
  switch (status) {
    case "keep":
      return "success";
    case "review":
      return "warning";
    case "cancel":
      return "danger";
  }
}

/* ------------------------------------------------------------------ */
/* Formatting                                                          */
/* ------------------------------------------------------------------ */

export function formatCurrency(value: number, withCents = false): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: withCents ? 2 : 0,
    maximumFractionDigits: withCents ? 2 : 0,
  }).format(value);
}

export function formatDate(iso: string): string {
  return parseYMD(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function formatRelativeDays(days: number): string {
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  if (days === -1) return "yesterday";
  if (days < 0) return `${Math.abs(days)} days ago`;
  return `in ${days} days`;
}

export function frequencyLabel(frequency: string): string {
  const map: Record<string, string> = {
    monthly: "Monthly",
    annually: "Annually",
    biweekly: "Biweekly",
    semester: "Per semester",
    variable: "Variable",
    "as-needed": "As needed",
  };
  return map[frequency] ?? frequency;
}
