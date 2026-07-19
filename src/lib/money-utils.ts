import type {
  Account,
  Alert,
  AlertSeverity,
  Bill,
  DashboardStatus,
  IncomeSource,
  Reliability,
  Subscription,
  Tone,
} from "@/types/money";
import {
  addDaysYMD,
  daysBetween,
  getBillsDueInDayWindow,
  getBillsDueThisMonth,
  getIncomeNextDate,
  getIncomeOccurrencesInRange,
  inferIncomeAnchorDate,
  parseYMD,
  resolveAsOfDate,
  toYMD,
} from "@/lib/recurrence";

/* ------------------------------------------------------------------ */
/* Dates                                                               */
/* ------------------------------------------------------------------ */

/** Next calendar occurrence of a given day-of-month (this month or next). */
export function nextMonthlyDate(day: number, asOf?: Date | string): string {
  const today = resolveAsOfDate(asOf);
  const candidate = new Date(today.getFullYear(), today.getMonth(), day);
  if (candidate < today) candidate.setMonth(candidate.getMonth() + 1);
  return toYMD(candidate);
}

export function daysFromNow(days: number, asOf?: Date | string): string {
  const d = resolveAsOfDate(asOf);
  d.setDate(d.getDate() + days);
  return toYMD(d);
}

export function daysUntil(iso: string, asOf?: Date | string): number {
  const today = toYMD(resolveAsOfDate(asOf));
  return daysBetween(today, iso.slice(0, 10));
}

/* ------------------------------------------------------------------ */
/* Monthly-equivalent costs                                            */
/* ------------------------------------------------------------------ */

export function monthlyAmountForBill(bill: Bill): number {
  const amount = bill.amount ?? 0;
  switch (bill.frequency) {
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
  switch (sub.frequency) {
    case "annual":
      return sub.amount / 12;
    case "weekly":
      return (sub.amount * 52) / 12;
    default:
      return sub.amount;
  }
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
    .reduce(
      (sum, a) => sum + (a.availableBalance ?? a.balance),
      0,
    );
}

/** Parse base guaranteed amount from numeric or text like "$350 + commission". */
export function parseIncomeBaseAmount(
  expectedAmount: number | null,
  amountType: IncomeSource["amountType"],
  notes?: string,
): number | null {
  if (expectedAmount != null && Number.isFinite(expectedAmount)) {
    return expectedAmount;
  }
  if (notes) {
    const match = notes.match(/\$?\s*([\d,]+(?:\.\d{1,2})?)/);
    if (match) {
      const parsed = Number(match[1].replace(/,/g, ""));
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  if (amountType === "unknown" || amountType === "variable") return null;
  return null;
}

/** Infer next pay date from frequency when not explicitly set. */
export function inferNextIncomeDate(
  source: IncomeSource,
  asOf?: Date | string,
): string | undefined {
  if (source.nextDate) {
    const next = getIncomeNextDate(source, asOf);
    return next ?? source.nextDate.slice(0, 10);
  }
  if (!source.active) return source.startDate;

  const anchor = inferIncomeAnchorDate(source);
  if (!anchor) return undefined;

  return getIncomeNextDate(source, asOf);
}

/** Monthly-equivalent income from active sources (base/guaranteed only). */
export function expectedMonthlyIncome(income: IncomeSource[]): number {
  return income
    .filter((i) => i.active)
    .reduce((sum, i) => {
      const base = parseIncomeBaseAmount(
        i.expectedAmount,
        i.amountType,
        i.notes,
      );
      if (base == null) return sum;
      switch (i.frequency) {
        case "weekly":
          return sum + (base * 52) / 12;
        case "biweekly":
          return sum + (base * 26) / 12;
        case "annual":
          return sum + base / 12;
        case "semester":
          return sum + base / 4;
        default:
          return sum + base;
      }
    }, 0);
}

export function activeIncomeCount(income: IncomeSource[]): number {
  return income.filter((i) => i.active).length;
}

export type DueWindow = {
  total: number;
  count: number;
  variableCount: number;
  items: Bill[];
  /** Effective due date per bill (next unpaid occurrence in window). */
  effectiveDueDates: Map<string, string>;
};

export function billsDueWithin(
  bills: Bill[],
  days: number,
  asOf?: Date | string,
): DueWindow {
  const occurrences = getBillsDueInDayWindow(bills, -7, days, asOf);
  const effectiveDueDates = new Map<string, string>();

  for (const { bill, occurrenceDate } of occurrences) {
    effectiveDueDates.set(bill.id, occurrenceDate);
  }

  const items = occurrences.map((o) => o.bill);

  return {
    total: occurrences.reduce((sum, o) => sum + (o.bill.amount ?? 0), 0),
    count: items.length,
    variableCount: items.filter((b) => b.amount === null).length,
    items,
    effectiveDueDates,
  };
}

export type IncomeWindow = { total: number; count: number; items: IncomeSource[] };

export function expectedIncomeWithin(
  income: IncomeSource[],
  days: number,
  asOf?: Date | string,
): IncomeWindow {
  const today = toYMD(resolveAsOfDate(asOf));
  const rangeEnd = addDaysYMD(today, days);

  const items = income.filter((i) => {
    if (!i.active) return false;

    const base = parseIncomeBaseAmount(i.expectedAmount, i.amountType, i.notes);
    if (base == null) return false;

    // Commission/variable upside is excluded unless explicitly expected in window
    if (
      (i.amountType === "variable" || i.reliability === "variable") &&
      !i.nextDate
    ) {
      return false;
    }

    const occurrences = getIncomeOccurrencesInRange(i, today, rangeEnd, asOf);
    return occurrences.length > 0;
  });

  return {
    total: items.reduce((sum, i) => {
      const base = parseIncomeBaseAmount(
        i.expectedAmount,
        i.amountType,
        i.notes,
      );
      return sum + (base ?? 0);
    }, 0),
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

export function overdueUnpaidCount(
  bills: Bill[],
  asOf?: Date | string,
): number {
  return getBillsDueInDayWindow(bills, -366, -1, asOf).filter(
    (o) => !o.bill.autopay,
  ).length;
}

/**
 * Dashboard status, in priority order:
 *  - Danger: an unpaid bill is overdue, or upcoming bills exceed cash + income.
 *  - Tight: upcoming bills eat a large share of available cash + expected income.
 *  - Review Needed: a high-severity decision is waiting on a human.
 *  - Watch: lower-priority review items exist.
 *  - Stable: nothing pressing.
 */
export function computeDashboardStatus(args: {
  cashAvailable: number;
  billsDue14: number;
  incomeExpected14: number;
  overdueUnpaid: number;
  hasHighSeverityReview: boolean;
  reviewItems: number;
}): DashboardStatus {
  const {
    cashAvailable,
    billsDue14,
    incomeExpected14,
    overdueUnpaid,
    hasHighSeverityReview,
    reviewItems,
  } = args;

  const runway = cashAvailable + incomeExpected14;

  if (overdueUnpaid > 0 || runway < billsDue14) return "Danger";
  if (billsDue14 > runway * 0.6) return "Tight";
  if (hasHighSeverityReview) return "Review Needed";
  if (reviewItems > 0) return "Watch";
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
    case "Setup Needed":
      return "Add cash accounts to assess bill coverage.";
  }
}

/* ------------------------------------------------------------------ */
/* Next responsible action                                             */
/* ------------------------------------------------------------------ */

const severityWeight: Record<AlertSeverity, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

export function alertPriority(alert: Alert): number {
  return severityWeight[alert.severity] * 10 + (alert.reviewRequired ? 5 : 0);
}

/** Sort alerts most-urgent first (severity, then review-required). */
export function sortAlerts(alerts: Alert[]): Alert[] {
  return [...alerts].sort((a, b) => alertPriority(b) - alertPriority(a));
}

export function activeAlerts(alerts: Alert[]): Alert[] {
  return alerts.filter((a) => a.status === "active");
}

/**
 * The single next responsible action — the highest-priority active alert. With
 * the starter data this surfaces the credit-card-from-savings decision.
 */
export function nextResponsibleAction(alerts: Alert[]): Alert | null {
  return sortAlerts(activeAlerts(alerts))[0] ?? null;
}

export function hasHighSeverityReview(alerts: Alert[]): boolean {
  return alerts.some(
    (a) => a.status === "active" && a.severity === "high" && a.reviewRequired,
  );
}

/* ------------------------------------------------------------------ */
/* Summary helpers                                                     */
/* ------------------------------------------------------------------ */

export function billsDueThisMonth(
  bills: Bill[],
  asOf?: Date | string,
): { total: number; count: number } {
  const occurrences = getBillsDueThisMonth(bills, asOf);
  return {
    total: occurrences.reduce((sum, o) => sum + (o.bill.amount ?? 0), 0),
    count: occurrences.length,
  };
}

/** Effective due date for display and sorting (next unpaid occurrence). */
export { getBillNextDueDate } from "@/lib/recurrence";

export function upcomingIncomeSources(income: IncomeSource[]): IncomeSource[] {
  return income.filter((i) => i.active || i.startDate);
}

export function monthlySubscriptionTotal(subscriptions: Subscription[]): number {
  return subscriptions.reduce(
    (sum, s) => sum + monthlyAmountForSubscription(s),
    0,
  );
}

export function defaultIncludeInCashAvailable(type: Account["type"]): boolean {
  return type === "checking" || type === "savings" || type === "cash";
}

/* ------------------------------------------------------------------ */
/* Cashflow trend (demo only — do not use for local_user projection)   */
/* ------------------------------------------------------------------ */

export function cashflowTrend(monthlyIncome: number, monthlySpending: number) {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
  const incomeFactors = [0.82, 0.91, 1.18, 0.96, 1.09, 1.0];
  const spendingFactors = [0.86, 1.07, 0.93, 1.24, 0.9, 1.0];
  return months.map((month, i) => ({
    month,
    income: Math.round(monthlyIncome * incomeFactors[i]),
    spending: Math.round(monthlySpending * spendingFactors[i]),
  }));
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
    case "Setup Needed":
      return "neutral";
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

export function toneForAlertSeverity(severity: AlertSeverity): Tone {
  switch (severity) {
    case "high":
      return "danger";
    case "medium":
      return "warning";
    case "low":
      return "info";
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
    weekly: "Weekly",
    biweekly: "Biweekly",
    monthly: "Monthly",
    annual: "Annual",
    "one-time": "One-time",
    semester: "Per semester",
    variable: "Variable",
    "as-needed": "As needed",
  };
  return map[frequency] ?? frequency;
}
