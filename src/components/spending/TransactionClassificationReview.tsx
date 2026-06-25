"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ClipboardList, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/EmptyState";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { SuggestCategoryButton } from "@/components/ai/SuggestCategoryButton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/money-utils";
import {
  isTransferLikeTransaction,
  transactionsNeedingReview,
} from "@/lib/transaction-utils";
import type { MoneyTransaction, TransactionCategory } from "@/types/transactions";

export function TransactionClassificationReview({
  transactions,
  active,
  categoryOverrides,
  onCategoryOverride,
  onClearFilter,
}: {
  transactions: MoneyTransaction[];
  active: boolean;
  categoryOverrides: Record<string, TransactionCategory>;
  onCategoryOverride: (transactionId: string, category: TransactionCategory) => void;
  onClearFilter?: () => void;
}) {
  const router = useRouter();
  const review = transactionsNeedingReview(transactions);
  const transfers = transactions.filter(isTransferLikeTransaction);

  useEffect(() => {
    if (!active) return;
    const el = document.getElementById("transaction-classification-review");
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [active]);

  if (!active) return null;

  const clearFilter =
    onClearFilter ??
    (() => {
      router.push("/spending");
    });

  return (
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
            {review.length} transaction{review.length === 1 ? "" : "s"} need a
            category before spending totals are fully trusted. Transfers and
            internal movements are listed separately and excluded from spending.
          </p>
        </div>
        <Button size="sm" variant="secondary" onClick={clearFilter}>
          <X className="size-3.5" />
          View all transactions
        </Button>
      </div>

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
              <TableHead>Date</TableHead>
              <TableHead>Merchant</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {review.map((transaction) => {
              const displayCategory =
                categoryOverrides[transaction.id] ?? "Review";
              const needsReview = !categoryOverrides[transaction.id];

              return (
                <TableRow key={transaction.id}>
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
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge
                        label={displayCategory}
                        tone={needsReview ? "warning" : "success"}
                      />
                      {needsReview ? (
                        <SuggestCategoryButton
                          transaction={transaction}
                          onApprove={(category) =>
                            onCategoryOverride(transaction.id, category)
                          }
                        />
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell
                    className={`text-right tabular-nums whitespace-nowrap ${
                      transaction.amount >= 0 ? "text-success" : ""
                    }`}
                  >
                    {transaction.amount >= 0 ? "+" : "-"}
                    {formatCurrency(Math.abs(transaction.amount), true)}
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
  );
}
