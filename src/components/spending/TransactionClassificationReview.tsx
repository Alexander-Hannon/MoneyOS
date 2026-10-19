"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ClipboardList, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/EmptyState";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { TransactionReviewDrawer } from "@/components/spending/TransactionReviewDrawer";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useFinancialData } from "@/hooks/useFinancialData";
import { formatCurrency, formatDate } from "@/lib/money-utils";
import { reviewStateLabel } from "@/lib/transaction-review/categories";
import {
  isTransferLikeTransaction,
  transactionsNeedingReview,
} from "@/lib/transaction-utils";
import type { MoneyTransaction } from "@/types/transactions";

function rowStateLabel(
  transaction: MoneyTransaction,
  bills: { id: string; name: string }[],
  subscriptions: { id: string; name: string }[],
): { label: string; tone: "warning" | "success" | "info" | "neutral" } {
  if (transaction.needsReview || transaction.classification === "review") {
    return { label: "Review", tone: "warning" };
  }
  const label = reviewStateLabel(transaction.reviewState, {
    linkedBillName: transaction.linkedBillId
      ? bills.find((b) => b.id === transaction.linkedBillId)?.name
      : null,
    linkedSubscriptionName: transaction.linkedSubscriptionId
      ? subscriptions.find((s) => s.id === transaction.linkedSubscriptionId)
          ?.name
      : null,
  });
  if (transaction.reviewState === "transfer") {
    return { label, tone: "info" };
  }
  if (
    transaction.reviewState === "linked_bill" ||
    transaction.reviewState === "linked_subscription"
  ) {
    return { label, tone: "success" };
  }
  return { label, tone: "success" };
}

export function TransactionClassificationReview({
  transactions,
  active,
  onClearFilter,
}: {
  transactions: MoneyTransaction[];
  active: boolean;
  onClearFilter?: () => void;
}) {
  const router = useRouter();
  const fd = useFinancialData();
  const review = useMemo(
    () => transactionsNeedingReview(transactions),
    [transactions],
  );
  const transfers = transactions.filter(isTransferLikeTransaction);
  const [activeTransactionId, setActiveTransactionId] = useState<string | null>(
    null,
  );
  const [initialTotal, setInitialTotal] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);

  const activeTransaction =
    review.find((t) => t.id === activeTransactionId) ??
    transactions.find((t) => t.id === activeTransactionId) ??
    null;

  const totalCount = initialTotal || review.length;
  const remainingCount = review.length;

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- review session bootstrap when filter opens/clears */
    if (!active) {
      setInitialTotal(0);
      setActiveTransactionId(null);
      setSelectedIds(new Set());
      return;
    }
    setInitialTotal((prev) => (prev > 0 ? prev : review.length));
  }, [active, review.length]);

  useEffect(() => {
    if (!active) return;
    const el = document.getElementById("transaction-classification-review");
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [active]);

  const openReview = (transactionId: string) => {
    setActiveTransactionId(transactionId);
  };

  const openNextReview = () => {
    const queue = transactionsNeedingReview(transactions);
    const next = queue.find((t) => t.id !== activeTransactionId);
    if (next) {
      setActiveTransactionId(next.id);
    } else {
      setActiveTransactionId(null);
    }
  };

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const bulkReviewLater = async () => {
    if (selectedIds.size === 0) return;
    setBulkBusy(true);
    try {
      for (const id of selectedIds) {
        await fd.submitTransactionReview(id, { action: "leave_unresolved" });
      }
      setSelectedIds(new Set());
    } finally {
      setBulkBusy(false);
    }
  };

  if (!active) return null;

  const clearFilter =
    onClearFilter ??
    (() => {
      router.push("/spending");
    });

  return (
    <>
      <div
        id="transaction-classification-review"
        className="scroll-mt-24 space-y-4 rounded-[var(--radius)] border border-warning/30 bg-warning/5 p-5"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold">
              <ClipboardList className="size-4 text-warning" />
              Transactions needing classification
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {remainingCount} of {totalCount} remaining — categorize, link to
              bills/subscriptions, or mark transfers before spending totals are
              fully trusted.
            </p>
          </div>
          <Button size="sm" variant="secondary" onClick={clearFilter}>
            <X className="size-3.5" />
            View all transactions
          </Button>
        </div>

        {selectedIds.size > 0 ? (
          <div className="flex flex-wrap items-center gap-2 rounded-[var(--radius-md)] border border-border bg-background/70 px-3 py-2 text-xs">
            <span>{selectedIds.size} selected</span>
            <Button
              size="sm"
              variant="secondary"
              disabled={bulkBusy}
              onClick={() => void bulkReviewLater()}
            >
              Mark selected as review later
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSelectedIds(new Set())}
            >
              Clear selection
            </Button>
          </div>
        ) : null}

        {review.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="No transactions need classification. Nice work."
            description="Spending totals reflect your categorized activity."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-8" />
                <TableHead>Date</TableHead>
                <TableHead>Merchant</TableHead>
                <TableHead>State</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {review.map((transaction) => {
                const state = rowStateLabel(
                  transaction,
                  fd.bills,
                  fd.subscriptions,
                );

                return (
                  <TableRow key={transaction.id}>
                    <TableCell>
                      <input
                        type="checkbox"
                        aria-label={`Select ${transaction.merchantName}`}
                        checked={selectedIds.has(transaction.id)}
                        onChange={() => toggleSelected(transaction.id)}
                        className="size-3.5 rounded border-border"
                      />
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      {formatDate(transaction.date)}
                    </TableCell>
                    <TableCell className="font-medium">
                      {transaction.merchantName}
                      {transaction.pending ? (
                        <span className="ml-1.5 text-xs text-muted-foreground">
                          (pending)
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <StatusBadge label={state.label} tone={state.tone} />
                    </TableCell>
                    <TableCell
                      className={`text-right num whitespace-nowrap ${
                        transaction.amount >= 0 ? "text-success" : ""
                      }`}
                    >
                      {transaction.amount >= 0 ? "+" : "-"}
                      {formatCurrency(Math.abs(transaction.amount), true)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => openReview(transaction.id)}
                      >
                        Review
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}

        {transfers.length > 0 ? (
          <div className="rounded-[var(--radius-md)] border border-border bg-background/60 p-3 text-xs text-muted-foreground">
            <p className="font-medium text-foreground">
              Transfers & internal movements ({transfers.length})
            </p>
            <p className="mt-1">
              These are kept separate from spending classification: credit card
              payments, loan payments, account transfers, and investments.
            </p>
          </div>
        ) : null}
      </div>

      <TransactionReviewDrawer
        open={active && activeTransactionId != null}
        onClose={() => setActiveTransactionId(null)}
        transaction={activeTransaction}
        bills={fd.bills}
        subscriptions={fd.subscriptions}
        linkedAccounts={fd.linkedAccounts}
        remainingCount={remainingCount}
        totalCount={totalCount}
        onReviewNext={openNextReview}
      />
    </>
  );
}
