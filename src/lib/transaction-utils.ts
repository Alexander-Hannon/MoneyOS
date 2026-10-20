import type {
  MoneyTransaction,
  SpendingAlert,
  TransactionCategory,
  TransactionClassification,
  TransactionType,
} from "@/types/transactions";

/* ------------------------------------------------------------------ */
/* Classification                                                      */
/* ------------------------------------------------------------------ */

export type ClassifyInput = {
  merchantName: string;
  description?: string;
  /** Positive = inflow, negative = outflow. */
  amount: number;
  /** Plaid personal_finance_category.primary */
  plaidPrimary?: string | null;
  /** Plaid personal_finance_category.detailed */
  plaidDetailed?: string | null;
};

export type ClassifyResult = {
  classification: TransactionClassification;
  category: TransactionCategory;
  type: TransactionType;
  needsReview: boolean;
};

const LARGE_REVIEW_THRESHOLD = 500;

/**
 * Rule-based merchant categorization for discretionary spending buckets.
 * Returns the display category; classification is decided separately.
 */
export function categorizeMerchant(name: string): {
  category: TransactionCategory;
  needsReview: boolean;
} {
  const n = name.toLowerCase();

  if (/rumble|payroll|paycheck|salary|gusto|direct dep|ach credit|employer payroll/.test(n))
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
    /utilit|electric|water|internet|comcast|spectrum|at&t|verizon|security|insurance|rent/.test(
      n,
    )
  )
    return { category: "Bills", needsReview: false };

  return { category: "Other", needsReview: false };
}

function combinedText(input: ClassifyInput): string {
  return `${input.merchantName} ${input.description ?? ""}`.toLowerCase();
}

function mapPlaidPrimary(primary: string | null | undefined): TransactionClassification | null {
  if (!primary) return null;
  const p = primary.toUpperCase();
  if (p === "INCOME") return "income";
  if (p.startsWith("TRANSFER")) return "transfer";
  if (p === "LOAN_PAYMENTS") return "loan_payment";
  if (p === "BANK_FEES") return "fee";
  if (p === "REFUND") return "refund";
  if (p === "INVESTMENT" || p === "INVESTMENTS") return "investment";
  return null;
}

/** Classify a transaction into a normalized bucket + display category. */
export function classifyTransaction(input: ClassifyInput): ClassifyResult {
  const text = combinedText(input);
  const isInflow = input.amount > 0;
  const isOutflow = input.amount < 0;
  const absAmount = Math.abs(input.amount);

  const plaidBucket = mapPlaidPrimary(input.plaidPrimary);
  if (plaidBucket === "income" && isInflow) {
    return {
      classification: "income",
      category: "Income",
      type: "income",
      needsReview: false,
    };
  }
  if (plaidBucket === "transfer") {
    return {
      classification: "transfer",
      category: "Transfer",
      type: "transfer",
      needsReview: false,
    };
  }
  if (plaidBucket === "loan_payment") {
    return {
      classification: "loan_payment",
      category: "Bills",
      type: "payment",
      needsReview: false,
    };
  }
  if (plaidBucket === "investment") {
    return {
      classification: "investment",
      category: "Transfer",
      type: "transfer",
      needsReview: false,
    };
  }
  if (plaidBucket === "fee") {
    return {
      classification: "fee",
      category: "Bills",
      type: "fee",
      needsReview: false,
    };
  }
  if (plaidBucket === "refund") {
    return {
      classification: "refund",
      category: "Other",
      type: "refund",
      needsReview: false,
    };
  }

  // Payroll / ACH income
  if (
    isInflow &&
    /payroll|paycheck|salary|gusto pay|gusto|direct dep|ach credit|employer payroll|primary employer/.test(
      text,
    )
  ) {
    return {
      classification: "income",
      category: "Income",
      type: "income",
      needsReview: false,
    };
  }

  // Credit card payments
  if (
    /credit card payment|credit card pmt|card payment|autopay card|automatic payment|payment to .*card|pmt to card/.test(
      text,
    )
  ) {
    return {
      classification: "credit_card_payment",
      category: "Bills",
      type: "payment",
      needsReview: false,
    };
  }

  // Loan / mortgage payments
  if (
    isOutflow &&
    /mortgage|loan payment|student loan|auto loan|heloc|sba loan/.test(text)
  ) {
    return {
      classification: "loan_payment",
      category: "Bills",
      type: "payment",
      needsReview: false,
    };
  }

  // CD deposits, investment movements, generic deposits (not payroll)
  if (
    /cd deposit|certificate deposit|brokerage transfer|investment transfer|401k|ira contribution|roth/.test(
      text,
    )
  ) {
    return {
      classification: "investment",
      category: "Transfer",
      type: "transfer",
      needsReview: false,
    };
  }

  if (/deposit/.test(text) && isInflow && !/payroll|paycheck|salary|gusto/.test(text)) {
    return {
      classification: "transfer",
      category: "Transfer",
      type: "transfer",
      needsReview: false,
    };
  }

  // Account transfers
  if (
    /transfer|xfer|zelle|venmo|cash app|wire|ach debit|ach transfer|online transfer|internal transfer/.test(
      text,
    )
  ) {
    return {
      classification: "transfer",
      category: "Transfer",
      type: "transfer",
      needsReview: false,
    };
  }

  // Refunds
  if (/refund|returned item|reversal|chargeback/.test(text) && isInflow) {
    return {
      classification: "refund",
      category: "Other",
      type: "refund",
      needsReview: false,
    };
  }

  // Fees
  if (/fee|overdraft|service charge|atm fee|monthly fee/.test(text) && isOutflow) {
    return {
      classification: "fee",
      category: "Bills",
      type: "fee",
      needsReview: false,
    };
  }

  // Generic inflow after exclusions
  if (isInflow) {
    return {
      classification: "income",
      category: "Income",
      type: "income",
      needsReview: false,
    };
  }

  // Outflow: try merchant categorization
  const merchant = categorizeMerchant(input.merchantName);
  if (merchant.category !== "Other") {
    return {
      classification: "spending",
      category: merchant.category,
      type: "debit",
      needsReview: false,
    };
  }

  // Unknown outflow — review if unrecognized or large
  const needsReview =
    merchant.needsReview ||
    absAmount >= LARGE_REVIEW_THRESHOLD ||
    /ach|pos purchase|sq \*|purchase|withdrawal|debit card/.test(text);

  return {
    classification: "review",
    category: "Review",
    type: "debit",
    needsReview,
  };
}

export function isSpendingTransaction(txn: MoneyTransaction): boolean {
  return txn.classification === "spending";
}

export function isIncomeTransaction(txn: MoneyTransaction): boolean {
  return txn.classification === "income";
}

export function isTransferLikeTransaction(txn: MoneyTransaction): boolean {
  return (
    txn.classification === "transfer" ||
    txn.classification === "investment" ||
    txn.classification === "credit_card_payment" ||
    txn.classification === "loan_payment"
  );
}

export function isPaymentLikeTransaction(txn: MoneyTransaction): boolean {
  return (
    txn.classification === "credit_card_payment" ||
    txn.classification === "loan_payment"
  );
}

export function shouldCountInMonthlySpending(txn: MoneyTransaction): boolean {
  return isSpendingTransaction(txn);
}

export function shouldCountAsReview(txn: MoneyTransaction): boolean {
  if (txn.needsReview === false) return false;
  if (txn.linkedBillId || txn.linkedSubscriptionId) return false;
  if (
    txn.reviewState === "linked_bill" ||
    txn.reviewState === "linked_subscription" ||
    txn.reviewState === "categorized" ||
    txn.reviewState === "transfer" ||
    txn.reviewState === "refund" ||
    txn.reviewState === "income"
  ) {
    return false;
  }
  if (txn.isTransferInternal) return false;
  return txn.classification === "review" || txn.needsReview;
}

/** @deprecated Use isSpendingTransaction */
export function isSpending(txn: MoneyTransaction): boolean {
  return shouldCountInMonthlySpending(txn);
}

/* ------------------------------------------------------------------ */
/* Date helpers                                                        */
/* ------------------------------------------------------------------ */

export function isInCurrentMonth(isoDate: string): boolean {
  const d = new Date(`${isoDate.slice(0, 10)}T00:00:00`);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
  );
}

export function filterCurrentMonth(txns: MoneyTransaction[]): MoneyTransaction[] {
  return txns.filter((t) => isInCurrentMonth(t.date));
}

/* ------------------------------------------------------------------ */
/* Aggregations                                                        */
/* ------------------------------------------------------------------ */

export function monthlySpendingTotal(txns: MoneyTransaction[]): number {
  return filterCurrentMonth(txns)
    .filter(shouldCountInMonthlySpending)
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);
}

export function monthlyIncomeTotal(txns: MoneyTransaction[]): number {
  return filterCurrentMonth(txns)
    .filter(isIncomeTransaction)
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);
}

export function reviewTotal(txns: MoneyTransaction[]): number {
  return filterCurrentMonth(txns)
    .filter(shouldCountAsReview)
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);
}

export function transferPaymentTotal(txns: MoneyTransaction[]): number {
  return filterCurrentMonth(txns)
    .filter(isTransferLikeTransaction)
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);
}

export type CategoryTotal = { category: TransactionCategory; total: number };

export function spendingByCategory(txns: MoneyTransaction[]): CategoryTotal[] {
  const map = new Map<TransactionCategory, number>();
  for (const t of filterCurrentMonth(txns).filter(shouldCountInMonthlySpending)) {
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
  for (const t of filterCurrentMonth(txns).filter(shouldCountInMonthlySpending)) {
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
  return filterCurrentMonth(txns).filter(shouldCountAsReview);
}

/** Merchants that look like recurring charges (subscriptions). */
export function recurringChargeCandidates(
  txns: MoneyTransaction[],
): MoneyTransaction[] {
  const monthTxns = filterCurrentMonth(txns).filter((t) => {
    if (!shouldCountInMonthlySpending(t)) return false;
    if (t.isRecurringExcluded) return false;
    if (t.linkedBillId || t.linkedSubscriptionId) return false;
    return true;
  });
  const counts = new Map<string, number>();
  monthTxns.forEach((t) =>
    counts.set(t.merchantName, (counts.get(t.merchantName) ?? 0) + 1),
  );

  const recurringCategories: TransactionCategory[] = [
    "Business / Productivity",
    "Tech",
    "Fitness",
  ];

  const seen = new Set<string>();
  const result: MoneyTransaction[] = [];
  for (const t of monthTxns) {
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


/* ------------------------------------------------------------------ */
/* Spending alerts                                                     */
/* ------------------------------------------------------------------ */

export function buildSpendingAlerts(
  txns: MoneyTransaction[],
): SpendingAlert[] {
  const alerts: SpendingAlert[] = [];

  const review = transactionsNeedingReview(txns);
  if (review.length > 0) {
    const total = reviewTotal(txns);
    alerts.push({
      id: "sa-review",
      type: "needs_review",
      severity: "medium",
      title: `${review.length} transaction${review.length === 1 ? "" : "s"} need classification`,
      description: `$${Math.round(total)} in uncategorized charges may need manual review.`,
      transactionId: review[0].id,
      amount: total,
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

  const large = filterCurrentMonth(txns)
    .filter((t) => t.classification === "spending" && Math.abs(t.amount) >= 500)
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

  const transfer = filterCurrentMonth(txns).find(isTransferLikeTransaction);
  if (transfer) {
    alerts.push({
      id: "sa-transfer",
      type: "transfer_detected",
      severity: "low",
      title: "Transfers / payments excluded",
      description: `${transferPaymentTotal(txns) > 0 ? `$${Math.round(transferPaymentTotal(txns))} in transfers and payments excluded from spending.` : "Transfer-like activity detected and excluded from spending totals."}`,
      transactionId: transfer.id,
    });
  }

  const seen = new Map<string, MoneyTransaction>();
  for (const t of filterCurrentMonth(txns).filter(shouldCountInMonthlySpending)) {
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
