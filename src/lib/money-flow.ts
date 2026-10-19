import type { MoneyTransaction } from "@/types/transactions";
import { isTransferLikeTransaction } from "@/lib/transaction-utils";
import { roundToCents } from "@/lib/recurring-obligations";

/*
 * Money Flow: where one month's money came from and where it went, built from
 * actual transactions. Transfers, card/loan payments, and investment moves
 * are movement between the user's own accounts, so they are reported as a
 * separate total and never drawn as income or spending.
 */

export type FlowGroup =
  | "income"
  | "refund"
  | "drawn"
  | "bill"
  | "subscription"
  | "spending"
  | "fee"
  | "review"
  | "leftover";

export type FlowNode = {
  id: string;
  label: string;
  group: FlowGroup;
  value: number;
  count: number;
};

export type MoneyFlow = {
  month: string;
  sources: FlowNode[];
  uses: FlowNode[];
  totalIn: number;
  totalOut: number;
  /** Positive = kept, negative = drawn from existing balances. */
  net: number;
  movedBetweenAccounts: number;
  transactionCount: number;
};

const MAX_INCOME_NODES = 4;
const MAX_CATEGORY_NODES = 6;

export function monthOf(date: string): string {
  return date.slice(0, 7);
}

/** Months that have transactions, newest first. */
export function availableFlowMonths(txns: MoneyTransaction[]): string[] {
  return [...new Set(txns.map((t) => monthOf(t.date)))].sort().reverse();
}

function bucket(
  map: Map<string, { value: number; count: number }>,
  key: string,
  amount: number,
) {
  const cur = map.get(key) ?? { value: 0, count: 0 };
  cur.value += amount;
  cur.count += 1;
  map.set(key, cur);
}

function topN(
  map: Map<string, { value: number; count: number }>,
  n: number,
  idPrefix: string,
  group: FlowGroup,
  otherLabel: string,
): FlowNode[] {
  const sorted = [...map.entries()]
    .map(([label, v]) => ({ label, ...v }))
    .filter((x) => x.value > 0)
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));
  const head = sorted.slice(0, n);
  const tail = sorted.slice(n);
  const nodes: FlowNode[] = head.map((x) => ({
    id: `${idPrefix}:${x.label}`,
    label: x.label,
    group,
    value: roundToCents(x.value),
    count: x.count,
  }));
  if (tail.length) {
    nodes.push({
      id: `${idPrefix}:__other`,
      label: otherLabel,
      group,
      value: roundToCents(tail.reduce((s, x) => s + x.value, 0)),
      count: tail.reduce((s, x) => s + x.count, 0),
    });
  }
  return nodes;
}

export function buildMoneyFlow(txns: MoneyTransaction[], month: string): MoneyFlow {
  const inMonth = txns.filter((t) => monthOf(t.date) === month);

  const income = new Map<string, { value: number; count: number }>();
  const categories = new Map<string, { value: number; count: number }>();
  let refunds = { value: 0, count: 0 };
  let bills = { value: 0, count: 0 };
  let subs = { value: 0, count: 0 };
  let fees = { value: 0, count: 0 };
  let review = { value: 0, count: 0 };
  let moved = 0;

  for (const t of inMonth) {
    const abs = Math.abs(t.amount);
    if (isTransferLikeTransaction(t) || t.isTransferInternal) {
      if (t.amount < 0) moved += abs;
      continue;
    }
    if (t.classification === "income") {
      bucket(income, t.merchantName || "Income", abs);
    } else if (t.classification === "refund" || t.isRefund) {
      refunds = { value: refunds.value + abs, count: refunds.count + 1 };
    } else if (t.classification === "fee") {
      fees = { value: fees.value + abs, count: fees.count + 1 };
    } else if (t.classification === "review") {
      review = { value: review.value + abs, count: review.count + 1 };
    } else if (t.classification === "spending") {
      if (t.linkedBillId) bills = { value: bills.value + abs, count: bills.count + 1 };
      else if (t.linkedSubscriptionId) subs = { value: subs.value + abs, count: subs.count + 1 };
      else bucket(categories, t.userConfirmedCategory || t.category || "Uncategorized", abs);
    }
  }

  const sources: FlowNode[] = topN(income, MAX_INCOME_NODES, "income", "income", "Other income");
  if (refunds.value > 0) {
    sources.push({ id: "refund", label: "Refunds", group: "refund", value: roundToCents(refunds.value), count: refunds.count });
  }

  const uses: FlowNode[] = [];
  if (bills.value > 0) uses.push({ id: "bills", label: "Bills", group: "bill", value: roundToCents(bills.value), count: bills.count });
  if (subs.value > 0) uses.push({ id: "subs", label: "Subscriptions", group: "subscription", value: roundToCents(subs.value), count: subs.count });
  uses.push(...topN(categories, MAX_CATEGORY_NODES, "cat", "spending", "Other spending"));
  if (fees.value > 0) uses.push({ id: "fees", label: "Fees", group: "fee", value: roundToCents(fees.value), count: fees.count });
  if (review.value > 0) uses.push({ id: "review", label: "Needs review", group: "review", value: roundToCents(review.value), count: review.count });

  const totalIn = roundToCents(sources.reduce((s, n) => s + n.value, 0));
  const totalOut = roundToCents(uses.reduce((s, n) => s + n.value, 0));
  const net = roundToCents(totalIn - totalOut);

  // Balance the diagram with an explicit, labeled node — never a hidden fudge.
  if (net > 0) uses.push({ id: "leftover", label: "Left over", group: "leftover", value: net, count: 0 });
  if (net < 0) sources.push({ id: "drawn", label: "Drawn from balances", group: "drawn", value: -net, count: 0 });

  return {
    month,
    sources,
    uses,
    totalIn,
    totalOut,
    net,
    movedBetweenAccounts: roundToCents(moved),
    transactionCount: inMonth.length,
  };
}
