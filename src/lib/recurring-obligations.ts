import {
  monthlyAmountForBill,
  monthlyAmountForSubscription,
} from "@/lib/money-utils";
import { recurringChargeCandidates } from "@/lib/transaction-utils";
import type { RecurringSuggestion } from "@/types/actions";
import type { Bill, Subscription } from "@/types/money";
import type { MoneyTransaction } from "@/types/transactions";

export function roundToCents(value: number): number {
  return Math.round(value * 100) / 100;
}

export type RecurringObligationsBreakdown = {
  confirmedBillsTotal: number;
  approvedSubscriptionsTotal: number;
  approvedRecurringTotal: number;
  detectedCandidatesExcludedTotal: number;
  /** Sum previously (incorrectly) added from raw transaction candidates when Plaid connected. */
  legacyTransactionCandidatesTotal: number;
  totalConfirmedMonthlyObligations: number;
};

export function isApprovedSubscription(subscription: Subscription): boolean {
  return subscription.status === "keep";
}

export function confirmedBillsMonthlyTotal(bills: Bill[]): number {
  return bills.reduce((sum, bill) => sum + monthlyAmountForBill(bill), 0);
}

export function approvedSubscriptionsMonthlyTotal(
  subscriptions: Subscription[],
): number {
  return subscriptions
    .filter(isApprovedSubscription)
    .reduce((sum, sub) => sum + monthlyAmountForSubscription(sub), 0);
}

export function detectedCandidatesMonthlyTotal(
  suggestions: RecurringSuggestion[],
): number {
  return suggestions.reduce((sum, row) => sum + row.detectedAmount, 0);
}

export function legacyTransactionCandidatesMonthlyTotal(
  transactions: MoneyTransaction[],
): number {
  return recurringChargeCandidates(transactions).reduce(
    (sum, txn) => sum + Math.abs(txn.amount),
    0,
  );
}

export function computeRecurringObligationsBreakdown(args: {
  bills: Bill[];
  subscriptions: Subscription[];
  recurringSuggestions: RecurringSuggestion[];
  transactions: MoneyTransaction[];
  plaidConnected: boolean;
}): RecurringObligationsBreakdown {
  const confirmedBillsTotal = confirmedBillsMonthlyTotal(args.bills);
  const approvedSubscriptionsTotal = approvedSubscriptionsMonthlyTotal(
    args.subscriptions,
  );
  const approvedRecurringTotal = confirmedBillsTotal + approvedSubscriptionsTotal;
  const detectedCandidatesExcludedTotal = detectedCandidatesMonthlyTotal(
    args.recurringSuggestions,
  );
  const legacyTransactionCandidatesTotal = args.plaidConnected
    ? legacyTransactionCandidatesMonthlyTotal(args.transactions)
    : 0;

  return {
    confirmedBillsTotal: roundToCents(confirmedBillsTotal),
    approvedSubscriptionsTotal: roundToCents(approvedSubscriptionsTotal),
    approvedRecurringTotal: roundToCents(approvedRecurringTotal),
    detectedCandidatesExcludedTotal: roundToCents(detectedCandidatesExcludedTotal),
    legacyTransactionCandidatesTotal: roundToCents(legacyTransactionCandidatesTotal),
    totalConfirmedMonthlyObligations: roundToCents(approvedRecurringTotal),
  };
}

export function reconciledRecurringTransactions(
  transactions: MoneyTransaction[],
): MoneyTransaction[] {
  return transactions.filter(
    (txn) => txn.linkedBillId || txn.linkedSubscriptionId,
  );
}
