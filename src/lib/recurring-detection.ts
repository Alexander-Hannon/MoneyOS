import type { RecurringSuggestion } from "@/types/actions";
import type { Bill, IncomeSource, Subscription } from "@/types/money";
import type { MoneyTransaction } from "@/types/transactions";
import {
  isIncomeTransaction,
  isTransferLikeTransaction,
} from "@/lib/transaction-utils";

function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

function suggestionId(merchant: string, amount: number): string {
  return `rec:${normalizeName(merchant)}:${Math.round(Math.abs(amount) * 100)}`;
}

const INTERNAL_BANK_MECHANICS =
  /overdraft protection|internet transfer|round up|transferred from checking|transferred to|deposit internet transfer|withdrawal internet transfer|atm transfer|loan payment|credit card payment|payment to card|ach withdrawal|ach deposit|xfer|internal transfer|between accounts|sweep transfer|mobile transfer/i;

const P2P_TRANSFER =
  /venmo|cash app|paypal|zelle|apple cash|google pay send/i;

function isInternalBankMechanics(txn: MoneyTransaction): boolean {
  const text = `${txn.merchantName} ${txn.description}`.toLowerCase();

  if (isTransferLikeTransaction(txn)) return true;
  if (txn.category === "Transfer") return true;
  if (INTERNAL_BANK_MECHANICS.test(text)) return true;

  if (P2P_TRANSFER.test(text)) {
    const subscriptionLike =
      /subscription|membership|monthly|annual|premium|plus plan/.test(text);
    if (!subscriptionLike) return true;
  }

  if (
    /deposit|withdrawal/.test(text) &&
    /transfer|protection|round up|checking|savings/.test(text)
  ) {
    return true;
  }

  return false;
}

function guessType(
  txn: MoneyTransaction,
): RecurringSuggestion["typeGuess"] {
  if (isInternalBankMechanics(txn)) return "transfer";
  if (isIncomeTransaction(txn)) return "income";
  if (isTransferLikeTransaction(txn)) return "transfer";
  if (txn.category === "Bills") return "bill";
  if (
    txn.category === "Tech" ||
    txn.category === "Business / Productivity" ||
    txn.category === "Fitness"
  ) {
    return "subscription";
  }
  if (txn.classification === "review" || txn.category === "Review") {
    return "review";
  }
  if (Math.abs(txn.amount) >= 50) return "bill";
  return "subscription";
}

function guessCadence(count: number): string {
  if (count >= 3) return "monthly (detected)";
  if (count === 2) return "recurring (2x this month)";
  return "possible recurring";
}

function guessConfidence(count: number): RecurringSuggestion["confidence"] {
  if (count >= 3) return "high";
  if (count === 2) return "medium";
  return "low";
}

function alreadyTracked(
  name: string,
  bills: Bill[],
  subscriptions: Subscription[],
  income: IncomeSource[],
): boolean {
  const fuzzy = (left: string, right: string) => {
    const a = normalizeName(left);
    const b = normalizeName(right);
    if (!a || !b) return false;
    if (a === b || a.includes(b) || b.includes(a)) return true;
    const tokens = (value: string) =>
      value.split(/\s+/).filter((token) => token.length >= 3);
    const aTokens = tokens(a);
    const bTokens = tokens(b);
    return aTokens.some((token) => bTokens.includes(token));
  };

  return (
    bills.some((b) => fuzzy(name, b.name) || (b.payeeName && fuzzy(name, b.payeeName))) ||
    subscriptions.some((s) => fuzzy(name, s.name)) ||
    income.some((i) => fuzzy(name, i.source))
  );
}

function isRecurringExcludedTransaction(txn: MoneyTransaction): boolean {
  if (txn.isRecurringExcluded) return true;
  if (txn.linkedBillId || txn.linkedSubscriptionId) return true;
  const state = txn.recurringReviewState;
  return (
    state === "linked_to_bill" ||
    state === "linked_to_subscription" ||
    state === "not_recurring" ||
    state === "ignored"
  );
}

/** Detect recurring items from transaction history — suggestions only. */
export function detectRecurringSuggestions(args: {
  transactions: MoneyTransaction[];
  bills: Bill[];
  subscriptions: Subscription[];
  income: IncomeSource[];
  dismissedIds: string[];
}): RecurringSuggestion[] {
  const { transactions, bills, subscriptions, income, dismissedIds } = args;
  if (transactions.length === 0) return [];

  const dismissed = new Set(dismissedIds);
  const groups = new Map<
    string,
    { txns: MoneyTransaction[]; total: number }
  >();

  for (const txn of transactions) {
    if (isInternalBankMechanics(txn)) continue;
    if (isRecurringExcludedTransaction(txn)) continue;

    const key = normalizeName(txn.merchantName);
    if (!key) continue;
    const cur = groups.get(key) ?? { txns: [], total: 0 };
    cur.txns.push(txn);
    cur.total += Math.abs(txn.amount);
    groups.set(key, cur);
  }

  const suggestions: RecurringSuggestion[] = [];

  for (const [, group] of groups) {
    if (group.txns.length < 2) continue;
    if (group.txns.every(isInternalBankMechanics)) continue;

    const sample = group.txns[0];
    const name = sample.merchantName;
    if (alreadyTracked(name, bills, subscriptions, income)) continue;

    const avgAmount = group.total / group.txns.length;
    const id = suggestionId(name, avgAmount);
    if (dismissed.has(id)) continue;

    const typeGuess = guessType(sample);
    if (typeGuess === "transfer") continue;

    suggestions.push({
      id,
      name,
      detectedAmount: Math.round(avgAmount * 100) / 100,
      cadence: guessCadence(group.txns.length),
      categoryGuess: sample.category,
      typeGuess,
      confidence: guessConfidence(group.txns.length),
      sourceTransactions: group.txns.map((t) => t.id),
      suggestedAction:
        typeGuess === "income"
          ? "Add as income source"
          : typeGuess === "bill"
            ? "Add as bill"
            : typeGuess === "subscription"
              ? "Add as subscription"
              : "Review transactions",
    });
  }

  return suggestions.sort((a, b) => {
    const rank = { high: 0, medium: 1, low: 2 };
    return rank[a.confidence] - rank[b.confidence];
  });
}
