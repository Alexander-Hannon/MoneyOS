import type { MoneyTransaction } from "@/types/transactions";
import {
  isIncomeTransaction,
  shouldCountInMonthlySpending,
  incomeVsSpendingTrend,
} from "@/lib/transaction-utils";

export type CashflowTrendPoint = {
  month: string;
  income: number;
  spending: number;
  /** YYYY-MM for sorting */
  monthKey: string;
};

function monthLabel(monthKey: string): string {
  const [year, month] = monthKey.split("-").map(Number);
  if (!year || !month) return monthKey;
  return new Date(year, month - 1, 1).toLocaleString("en-US", {
    month: "short",
    year: "2-digit",
  });
}

/** Build monthly income/spending totals from actual transaction dates. */
export function buildCashflowTrendFromTransactions(
  txns: MoneyTransaction[],
): CashflowTrendPoint[] {
  const byMonth = new Map<string, { income: number; spending: number }>();

  for (const txn of txns) {
    const monthKey = txn.date.slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(monthKey)) continue;

    const cur = byMonth.get(monthKey) ?? { income: 0, spending: 0 };
    if (isIncomeTransaction(txn)) {
      cur.income += Math.abs(txn.amount);
    } else if (shouldCountInMonthlySpending(txn)) {
      cur.spending += Math.abs(txn.amount);
    }
    byMonth.set(monthKey, cur);
  }

  return [...byMonth.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([monthKey, totals]) => ({
      monthKey,
      month: monthLabel(monthKey),
      income: Math.round(totals.income),
      spending: Math.round(totals.spending),
    }));
}

export function hasEnoughCashflowHistory(points: CashflowTrendPoint[]): boolean {
  return points.length >= 2;
}

export function currentMonthCashflowSnapshot(
  points: CashflowTrendPoint[],
): CashflowTrendPoint | null {
  if (points.length === 0) return null;
  return points[points.length - 1] ?? null;
}

export function resolveCashflowTrend(args: {
  transactions: MoneyTransaction[];
  allowSyntheticFallback: boolean;
}): CashflowTrendPoint[] {
  const real = buildCashflowTrendFromTransactions(args.transactions);
  if (hasEnoughCashflowHistory(real)) {
    return real;
  }
  if (args.allowSyntheticFallback && args.transactions.length > 0) {
    return incomeVsSpendingTrend(args.transactions).map((point, index) => ({
      month: point.month,
      income: point.income,
      spending: point.spending,
      monthKey: `synthetic-${index}`,
    }));
  }
  return real;
}
