// Core MoneyOS finance logic: cashflow math, spending alerts, and the
// rule-based "Money Agent" review. Kept framework-agnostic so it can be unit
// tested and reused by both server components and API routes.

export type Bill = {
  id: string;
  name: string;
  amount: number;
  dueDay: number;
  category: string;
  autopay: boolean;
};

export type Income = {
  id: string;
  source: string;
  amount: number;
  frequency: string;
};

export type Subscription = {
  id: string;
  name: string;
  amount: number;
  billingCycle: string;
  category: string;
};

export type FinanceSnapshot = {
  bills: Bill[];
  income: Income[];
  subscriptions: Subscription[];
};

export type Severity = "info" | "warning" | "critical";

export type SpendingAlert = {
  id: string;
  severity: Severity;
  title: string;
  detail: string;
};

export type AgentReview = {
  healthScore: number;
  monthlyIncome: number;
  monthlyOutflow: number;
  netCashflow: number;
  summary: string;
  recommendations: string[];
};

/** Normalize any income entry to a monthly figure. */
export function monthlyIncomeAmount(income: Income): number {
  switch (income.frequency) {
    case "weekly":
      return income.amount * 52 / 12;
    case "biweekly":
      return income.amount * 26 / 12;
    case "yearly":
      return income.amount / 12;
    default:
      return income.amount;
  }
}

/** Normalize any subscription to a monthly figure. */
export function monthlySubscriptionAmount(sub: Subscription): number {
  switch (sub.billingCycle) {
    case "yearly":
      return sub.amount / 12;
    case "weekly":
      return sub.amount * 52 / 12;
    default:
      return sub.amount;
  }
}

export function totalMonthlyIncome(snapshot: FinanceSnapshot): number {
  return snapshot.income.reduce((sum, i) => sum + monthlyIncomeAmount(i), 0);
}

export function totalMonthlyBills(snapshot: FinanceSnapshot): number {
  return snapshot.bills.reduce((sum, b) => sum + b.amount, 0);
}

export function totalMonthlySubscriptions(snapshot: FinanceSnapshot): number {
  return snapshot.subscriptions.reduce(
    (sum, s) => sum + monthlySubscriptionAmount(s),
    0,
  );
}

export function totalMonthlyOutflow(snapshot: FinanceSnapshot): number {
  return totalMonthlyBills(snapshot) + totalMonthlySubscriptions(snapshot);
}

export function netCashflow(snapshot: FinanceSnapshot): number {
  return totalMonthlyIncome(snapshot) - totalMonthlyOutflow(snapshot);
}

/**
 * Generate spending alerts from the current snapshot. These are the
 * notifications surfaced on the dashboard.
 */
export function buildSpendingAlerts(snapshot: FinanceSnapshot): SpendingAlert[] {
  const alerts: SpendingAlert[] = [];
  const income = totalMonthlyIncome(snapshot);
  const outflow = totalMonthlyOutflow(snapshot);
  const subs = totalMonthlySubscriptions(snapshot);
  const net = income - outflow;

  if (income > 0 && net < 0) {
    alerts.push({
      id: "overspend",
      severity: "critical",
      title: "Spending exceeds income",
      detail: `You are running ${formatCurrency(Math.abs(net))} short every month.`,
    });
  }

  if (income > 0 && subs / income > 0.15) {
    alerts.push({
      id: "subscription-creep",
      severity: "warning",
      title: "Subscription creep",
      detail: `Subscriptions are ${(100 * subs / income).toFixed(0)}% of your income (${formatCurrency(subs)}/mo).`,
    });
  }

  if (income > 0 && net >= 0 && net / income < 0.1) {
    alerts.push({
      id: "thin-buffer",
      severity: "warning",
      title: "Thin savings buffer",
      detail: `Only ${(100 * net / income).toFixed(0)}% of income is left after bills.`,
    });
  }

  const upcoming = snapshot.bills.filter((b) => !b.autopay && b.dueDay <= 5);
  if (upcoming.length > 0) {
    alerts.push({
      id: "due-soon",
      severity: "info",
      title: "Bills due early in the month",
      detail: `${upcoming.length} non-autopay bill(s) are due by the 5th.`,
    });
  }

  if (alerts.length === 0 && income > 0) {
    alerts.push({
      id: "all-clear",
      severity: "info",
      title: "All clear",
      detail: "No spending issues detected. Nice work!",
    });
  }

  return alerts;
}

/**
 * The "Money Agent": produces a financial health score (0-100) plus a plain
 * language summary and actionable recommendations.
 */
export function runMoneyAgent(snapshot: FinanceSnapshot): AgentReview {
  const monthlyIncome = totalMonthlyIncome(snapshot);
  const monthlyOutflow = totalMonthlyOutflow(snapshot);
  const net = monthlyIncome - monthlyOutflow;
  const subs = totalMonthlySubscriptions(snapshot);

  let score = 70;
  if (monthlyIncome > 0) {
    const savingsRate = net / monthlyIncome;
    score = Math.round(50 + savingsRate * 100);
    if (subs / monthlyIncome > 0.15) score -= 10;
  } else {
    score = 0;
  }
  score = Math.max(0, Math.min(100, score));

  const recommendations: string[] = [];
  if (net < 0) {
    recommendations.push(
      "Cut recurring costs or grow income — you are spending more than you earn.",
    );
  }
  if (monthlyIncome > 0 && subs / monthlyIncome > 0.15) {
    recommendations.push(
      "Review subscriptions; several may be unused and can be cancelled.",
    );
  }
  if (monthlyIncome > 0 && net >= 0 && net / monthlyIncome < 0.2) {
    recommendations.push(
      "Aim to keep at least 20% of income for savings and emergencies.",
    );
  }
  if (recommendations.length === 0) {
    recommendations.push(
      "Healthy cashflow — consider automating transfers to savings.",
    );
  }

  const summary =
    monthlyIncome === 0
      ? "Add an income source so the Money Agent can assess your finances."
      : net >= 0
        ? `You keep ${formatCurrency(net)} per month (${(100 * net / monthlyIncome).toFixed(0)}% of income).`
        : `You overspend by ${formatCurrency(Math.abs(net))} per month.`;

  return {
    healthScore: score,
    monthlyIncome,
    monthlyOutflow,
    netCashflow: net,
    summary,
    recommendations,
  };
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}
