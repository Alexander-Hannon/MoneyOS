import type {
  MoneyTransaction,
  SpendingAlert,
  TransactionCategory,
} from "@/types/transactions";

/* ------------------------------------------------------------------ */
/* Categorization                                                      */
/* ------------------------------------------------------------------ */

/**
 * Rule-based merchant categorization. Returns the bucket plus whether the
 * transaction should be flagged for human review (unknown merchant).
 */
export function categorizeMerchant(name: string): {
  category: TransactionCategory;
  needsReview: boolean;
} {
  const n = name.toLowerCase();

  // Income first so "Rumble Boxing" isn't mistaken for a gym.
  if (/rumble|payroll|paycheck|deposit|salary/.test(n))
    return { category: "Income", needsReview: false };
  if (/amazon|amzn|target|walmart|etsy|ebay/.test(n))
    return { category: "Convenience / Shopping", needsReview: false };
  if (/cursor|capcut|outlook|notion|github|adobe|figma/.test(n))
    return { category: "Business / Productivity", needsReview: false };
  if (/icloud|apple\.com|google one|dropbox|spotify|hulu|netflix|disney/.test(n))
    return { category: "Tech", needsReview: false };
  if (/shell|chevron|exxon|bp |mobil|gas|fuel|arco|sunoco/.test(n))
    return { category: "Gas", needsReview: false };
  if (/gym|fitness|peloton|crossfit|yoga/.test(n))
    return { category: "Fitness", needsReview: false };
  if (
    /whole foods|trader joe|grocery|market|safeway|kroger|aldi|costco/.test(n)
  )
    return { category: "Food", needsReview: false };
  if (
    /chipotle|starbucks|mcdonald|olive garden|grill|cafe|coffee|pizza|taco|kitchen|eatery|diner|restaurant|bar |bbq|sushi/.test(
      n,
    )
  )
    return { category: "Food", needsReview: false };
  if (
    /utilit|electric|water|internet|comcast|spectrum|at&t|verizon|security|insurance|rent|mortgage/.test(
      n,
    )
  )
    return { category: "Bills", needsReview: false };
  if (/transfer|xfer|zelle|venmo|cash app/.test(n))
    return { category: "Transfer", needsReview: false };

  return { category: "Review", needsReview: true };
}

/* ------------------------------------------------------------------ */
/* Aggregations                                                        */
/* ------------------------------------------------------------------ */

/** True for transactions that count as discretionary/consumed spending. */
export function isSpending(txn: MoneyTransaction): boolean {
  return txn.type === "debit" || txn.type === "fee";
}

export function monthlySpendingTotal(txns: MoneyTransaction[]): number {
  return txns
    .filter(isSpending)
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);
}

export function monthlyIncomeTotal(txns: MoneyTransaction[]): number {
  return txns
    .filter((t) => t.type === "income" || t.type === "credit")
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);
}

export type CategoryTotal = { category: TransactionCategory; total: number };

export function spendingByCategory(txns: MoneyTransaction[]): CategoryTotal[] {
  const map = new Map<TransactionCategory, number>();
  for (const t of txns.filter(isSpending)) {
    map.set(t.category, (map.get(t.category) ?? 0) + Math.abs(t.amount));
  }
  return [...map.entries()]
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total);
}

export type MerchantTotal = { name: string; total: number; count: number };

export function topMerchants(
  txns: MoneyTransaction[],
  limit = 5,
): MerchantTotal[] {
  const map = new Map<string, { total: number; count: number }>();
  for (const t of txns.filter(isSpending)) {
    const cur = map.get(t.merchantName) ?? { total: 0, count: 0 };
    map.set(t.merchantName, {
      total: cur.total + Math.abs(t.amount),
      count: cur.count + 1,
    });
  }
  return [...map.entries()]
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.total - a.total)
    .slice(0, limit);
}

export function recentTransactions(
  txns: MoneyTransaction[],
  limit = 8,
): MoneyTransaction[] {
  return [...txns]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, limit);
}

export function transactionsNeedingReview(
  txns: MoneyTransaction[],
): MoneyTransaction[] {
  return txns.filter((t) => t.needsReview);
}

/** Merchants that look like recurring charges (subscriptions). */
export function recurringChargeCandidates(
  txns: MoneyTransaction[],
): MoneyTransaction[] {
  const counts = new Map<string, number>();
  txns.forEach((t) => counts.set(t.merchantName, (counts.get(t.merchantName) ?? 0) + 1));

  const recurringCategories: TransactionCategory[] = [
    "Business / Productivity",
    "Tech",
    "Fitness",
  ];

  const seen = new Set<string>();
  const result: MoneyTransaction[] = [];
  for (const t of txns) {
    if (!isSpending(t)) continue;
    const looksRecurring =
      (counts.get(t.merchantName) ?? 0) > 1 ||
      recurringCategories.includes(t.category);
    if (looksRecurring && !seen.has(t.merchantName)) {
      seen.add(t.merchantName);
      result.push(t);
    }
  }
  return result;
}

/** Deterministic 6-month income-vs-spending trend anchored on current totals. */
export function incomeVsSpendingTrend(txns: MoneyTransaction[]) {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
  const spending = monthlySpendingTotal(txns) || 1800;
  const income = Math.max(monthlyIncomeTotal(txns) * 4, 3000); // monthly-ish
  const incomeFactors = [0.82, 0.91, 1.18, 0.96, 1.09, 1.0];
  const spendingFactors = [0.86, 1.07, 0.93, 1.24, 0.9, 1.0];
  return months.map((month, i) => ({
    month,
    income: Math.round(income * incomeFactors[i]),
    spending: Math.round(spending * spendingFactors[i]),
  }));
}

/* ------------------------------------------------------------------ */
/* Spending alerts                                                     */
/* ------------------------------------------------------------------ */

export function buildSpendingAlerts(
  txns: MoneyTransaction[],
): SpendingAlert[] {
  const alerts: SpendingAlert[] = [];

  const review = transactionsNeedingReview(txns);
  if (review.length > 0) {
    alerts.push({
      id: "sa-review",
      type: "needs_review",
      severity: "medium",
      title: `${review.length} transaction${review.length === 1 ? "" : "s"} need review`,
      description: "Uncategorized charges from unknown merchants need a category.",
      transactionId: review[0].id,
    });
  }

  const recurring = recurringChargeCandidates(txns);
  if (recurring.length > 0) {
    alerts.push({
      id: "sa-subscription",
      type: "subscription_detected",
      severity: "low",
      title: "Subscription-like charges detected",
      description: `${recurring.length} recurring charges (e.g. ${recurring
        .slice(0, 3)
        .map((t) => t.merchantName)
        .join(", ")}).`,
    });
  }

  const food = spendingByCategory(txns).find((c) => c.category === "Food");
  if (food && food.total > 200) {
    alerts.push({
      id: "sa-spike",
      type: "spending_spike",
      severity: "medium",
      title: "Lifestyle spending spike",
      description: `Food & dining is up to $${Math.round(food.total)} this month.`,
      amount: food.total,
    });
  }

  const large = txns
    .filter((t) => (t.type === "debit" || t.type === "payment") && Math.abs(t.amount) >= 500)
    .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))[0];
  if (large) {
    alerts.push({
      id: "sa-large",
      type: "large_bill",
      severity: "high",
      title: "Large charge detected",
      description: `${large.merchantName} for $${Math.abs(large.amount).toFixed(0)}.`,
      transactionId: large.id,
      amount: Math.abs(large.amount),
    });
  }

  const transfer = txns.find((t) => t.type === "transfer");
  if (transfer) {
    alerts.push({
      id: "sa-transfer",
      type: "transfer_detected",
      severity: "low",
      title: "Transfer / payment detected",
      description: `${transfer.merchantName} for $${Math.abs(transfer.amount).toFixed(0)}.`,
      transactionId: transfer.id,
    });
  }

  const seen = new Map<string, MoneyTransaction>();
  for (const t of txns) {
    const key = `${t.merchantName}|${Math.abs(t.amount)}`;
    if (seen.has(key)) {
      alerts.push({
        id: "sa-duplicate",
        type: "possible_duplicate",
        severity: "medium",
        title: "Possible duplicate charge",
        description: `${t.merchantName} charged $${Math.abs(t.amount).toFixed(2)} more than once.`,
        transactionId: t.id,
      });
      break;
    }
    seen.set(key, t);
  }

  return alerts;
}
