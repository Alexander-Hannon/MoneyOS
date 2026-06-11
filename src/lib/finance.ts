import type {
  Bill,
  IncomeSource,
  MoneyAlert,
  MoneyOSData,
  Subscription,
} from "@/lib/types";

const MS_PER_DAY = 1000 * 60 * 60 * 24;

export function daysUntil(iso: string): number {
  const target = new Date(iso);
  target.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / MS_PER_DAY);
}

export function monthlyAmount(amount: number, cadence: string): number {
  switch (cadence) {
    case "weekly":
      return (amount * 52) / 12;
    case "biweekly":
      return (amount * 26) / 12;
    case "yearly":
      return amount / 12;
    default:
      return amount;
  }
}

export function monthlyIncome(income: IncomeSource[]): number {
  return income.reduce((sum, i) => sum + monthlyAmount(i.amount, i.cadence), 0);
}

export function monthlyBills(bills: Bill[]): number {
  return bills.reduce((sum, b) => sum + b.amount, 0);
}

export function monthlySubscriptions(subs: Subscription[]): number {
  return subs.reduce((sum, s) => sum + monthlyAmount(s.amount, s.cadence), 0);
}

export type MoneySnapshot = {
  totalBalance: number;
  monthlyIncome: number;
  monthlyBills: number;
  monthlySubscriptions: number;
  monthlyOutflow: number;
  netCashflow: number;
  savingsRate: number;
  /** What's left this month after upcoming, unpaid obligations. */
  safeToSpend: number;
  upcomingBillsTotal: number;
};

export function buildSnapshot(data: MoneyOSData): MoneySnapshot {
  const income = monthlyIncome(data.income);
  const bills = monthlyBills(data.bills);
  const subs = monthlySubscriptions(data.subscriptions);
  const outflow = bills + subs;
  const totalBalance = data.accounts.reduce((s, a) => s + a.balance, 0);

  const upcomingBillsTotal = data.bills
    .filter((b) => b.status !== "paid")
    .reduce((s, b) => s + b.amount, 0);

  const checking =
    data.accounts.find((a) => a.type === "checking")?.balance ?? 0;
  const upcomingSubs = data.subscriptions
    .filter((s) => daysUntil(s.nextRenewal) <= 30)
    .reduce((s, x) => s + x.amount, 0);

  return {
    totalBalance,
    monthlyIncome: income,
    monthlyBills: bills,
    monthlySubscriptions: subs,
    monthlyOutflow: outflow,
    netCashflow: income - outflow,
    savingsRate: income > 0 ? (income - outflow) / income : 0,
    safeToSpend: checking - upcomingBillsTotal - upcomingSubs,
    upcomingBillsTotal,
  };
}

/**
 * The Money Agent: scans bills, income, and subscriptions and produces
 * prioritized alerts. The highest-priority alert becomes the
 * "next responsible financial action".
 */
export function buildAlerts(data: MoneyOSData): MoneyAlert[] {
  const alerts: MoneyAlert[] = [];
  const snapshot = buildSnapshot(data);

  for (const bill of data.bills) {
    if (bill.status === "paid") continue;
    const due = daysUntil(bill.dueDate);

    if (due < 0) {
      alerts.push({
        id: `overdue-${bill.id}`,
        kind: "bill-overdue",
        severity: "critical",
        title: `${bill.name} is overdue`,
        description: `${formatCurrency(bill.amount)} was due ${formatRelativeDays(due)}.`,
        amount: bill.amount,
        action: `Pay ${bill.name} now`,
        priority: 1000 + bill.amount,
      });
    } else if (!bill.autopay && due <= 3) {
      alerts.push({
        id: `due-${bill.id}`,
        kind: "bill-due",
        severity: due <= 1 ? "critical" : "warning",
        title: `${bill.name} due ${formatRelativeDays(due)}`,
        description: `${formatCurrency(bill.amount)} is due and not on autopay.`,
        amount: bill.amount,
        action: `Pay ${bill.name}`,
        priority: 800 + bill.amount - due * 10,
      });
    }
  }

  for (const sub of data.subscriptions) {
    if (sub.trialEndsAt) {
      const left = daysUntil(sub.trialEndsAt);
      if (left <= 5) {
        alerts.push({
          id: `trial-${sub.id}`,
          kind: "trial-ending",
          severity: left <= 2 ? "critical" : "warning",
          title: `${sub.name} trial ends ${formatRelativeDays(left)}`,
          description: `You'll be charged ${formatCurrency(sub.amount)} unless you cancel.`,
          amount: sub.amount,
          action: `Decide on ${sub.name}`,
          priority: 700 - left * 10,
        });
      }
    }
    if (sub.usage === "unused") {
      alerts.push({
        id: `unused-${sub.id}`,
        kind: "unused-subscription",
        severity: "warning",
        title: `${sub.name} looks unused`,
        description: `Cancelling saves ${formatCurrency(monthlyAmount(sub.amount, sub.cadence))}/mo.`,
        amount: sub.amount,
        action: `Cancel ${sub.name}`,
        priority: 400 + monthlyAmount(sub.amount, sub.cadence),
      });
    }
    if (sub.priceIncrease && sub.priceIncrease > 0) {
      alerts.push({
        id: `price-${sub.id}`,
        kind: "price-increase",
        severity: "info",
        title: `${sub.name} price went up`,
        description: `Increased by ${formatCurrency(sub.priceIncrease)}/mo. Worth a review.`,
        amount: sub.priceIncrease,
        action: `Review ${sub.name}`,
        priority: 250 + sub.priceIncrease,
      });
    }
  }

  if (
    snapshot.monthlyIncome > 0 &&
    snapshot.monthlySubscriptions / snapshot.monthlyIncome > 0.1
  ) {
    alerts.push({
      id: "subscription-creep",
      kind: "subscription-creep",
      severity: "warning",
      title: "Subscriptions are creeping up",
      description: `${formatCurrency(snapshot.monthlySubscriptions)}/mo — ${(
        (100 * snapshot.monthlySubscriptions) /
        snapshot.monthlyIncome
      ).toFixed(0)}% of income.`,
      action: "Trim the watchlist",
      priority: 300,
    });
  }

  if (snapshot.safeToSpend < 0) {
    alerts.push({
      id: "low-buffer",
      kind: "low-buffer",
      severity: "critical",
      title: "Checking won't cover upcoming bills",
      description: `Short ${formatCurrency(Math.abs(snapshot.safeToSpend))} before the next paycheck.`,
      amount: Math.abs(snapshot.safeToSpend),
      action: "Move money from savings",
      priority: 950,
    });
  }

  if (alerts.length === 0) {
    alerts.push({
      id: "all-clear",
      kind: "all-clear",
      severity: "info",
      title: "All clear",
      description: "No urgent actions. Nice and disciplined.",
      action: "Keep it up",
      priority: 0,
    });
  }

  return alerts.sort((a, b) => b.priority - a.priority);
}

export function nextResponsibleAction(data: MoneyOSData): MoneyAlert {
  return buildAlerts(data)[0];
}

/** Six-month cashflow trend for the snapshot chart (mock, deterministic). */
export function cashflowTrend(snapshot: MoneySnapshot) {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
  const factors = [0.94, 1.02, 0.97, 1.05, 0.99, 1.0];
  return months.map((month, i) => {
    const income = Math.round(snapshot.monthlyIncome * factors[i]);
    const spending = Math.round(
      snapshot.monthlyOutflow * (factors[i] + (i % 2 === 0 ? 0.04 : -0.02)),
    );
    return { month, income, spending };
  });
}

export function formatCurrency(value: number, withCents = false): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: withCents ? 2 : 0,
    maximumFractionDigits: withCents ? 2 : 0,
  }).format(value);
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
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
