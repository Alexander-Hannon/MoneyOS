import type { Bill, Subscription } from "@/types/money";
import type { MoneyTransaction } from "@/types/transactions";

function normalizeMerchantKey(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function tokenize(value: string): string[] {
  return normalizeMerchantKey(value)
    .split(" ")
    .filter((token) => token.length >= 3);
}

function namesMatch(left: string, right: string): boolean {
  const a = normalizeMerchantKey(left);
  const b = normalizeMerchantKey(right);
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.includes(b) || b.includes(a)) return true;

  const aTokens = tokenize(left);
  const bTokens = tokenize(right);
  return aTokens.some((token) => bTokens.includes(token));
}

export type TransactionReconciliationMatch = {
  bill: Bill | null;
  subscription: Subscription | null;
  transferLikelihood: "low" | "medium" | "high";
};

export function reconcileTransactionWithObligations(args: {
  transaction: MoneyTransaction;
  bills: Bill[];
  subscriptions: Subscription[];
}): TransactionReconciliationMatch {
  const { transaction, bills, subscriptions } = args;
  const merchant = transaction.merchantName || transaction.description;

  const bill =
    bills.find((row) => namesMatch(merchant, row.name)) ??
    bills.find((row) => row.payeeName && namesMatch(merchant, row.payeeName)) ??
    null;

  const subscription =
    subscriptions.find((row) => namesMatch(merchant, row.name)) ?? null;

  const text = `${transaction.merchantName} ${transaction.description}`.toLowerCase();
  let transferLikelihood: TransactionReconciliationMatch["transferLikelihood"] =
    "low";
  if (
    transaction.classification === "transfer" ||
    transaction.category === "Transfer" ||
    transaction.isTransferInternal
  ) {
    transferLikelihood = "high";
  } else if (
    /transfer|payment to card|credit card payment|zelle|venmo|internal/.test(text)
  ) {
    transferLikelihood = "medium";
  }

  return { bill, subscription, transferLikelihood };
}

export function recurringSuggestionIdForTransaction(
  transaction: MoneyTransaction,
): string {
  const amount = Math.round(Math.abs(transaction.amount) * 100);
  const merchant = normalizeMerchantKey(transaction.merchantName).replace(
    /\s+/g,
    "",
  );
  return `rec:${merchant}:${amount}`;
}
