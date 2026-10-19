"use client";

import { useMemo, useState } from "react";
import { Loader2, Sparkles, Link2, ArrowRightLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useToast } from "@/components/ui/toast";
import { useTransactionReview } from "@/hooks/useTransactionReview";
import { AI_DISCLAIMER } from "@/lib/ai/money-agent-prompts";
import type { ClassifyTransactionOutput } from "@/lib/ai/types";
import { formatCurrency, formatDate } from "@/lib/money-utils";
import {
  domainCategoryToReview,
  reviewStateLabel,
} from "@/lib/transaction-review/categories";
import { reconcileTransactionWithObligations } from "@/lib/transaction-review/reconciliation";
import type { Bill, Subscription } from "@/types/money";
import { REVIEW_CATEGORIES } from "@/types/transaction-review";
import type { TransactionReviewPayload } from "@/types/transaction-review";
import type { LinkedAccount, MoneyTransaction } from "@/types/transactions";

function accountLabel(
  accountId: string,
  linkedAccounts: LinkedAccount[],
): string {
  const account = linkedAccounts.find((row) => row.id === accountId);
  if (!account) return "Account";
  return account.mask ? `${account.name} ••${account.mask}` : account.name;
}

function currentStateLabel(
  transaction: MoneyTransaction,
  bills: Bill[],
  subscriptions: Subscription[],
): string {
  const billName = transaction.linkedBillId
    ? bills.find((b) => b.id === transaction.linkedBillId)?.name
    : null;
  const subscriptionName = transaction.linkedSubscriptionId
    ? subscriptions.find((s) => s.id === transaction.linkedSubscriptionId)?.name
    : null;
  return reviewStateLabel(transaction.reviewState, {
    linkedBillName: billName,
    linkedSubscriptionName: subscriptionName,
  });
}

export function TransactionReviewDrawer({
  open,
  onClose,
  transaction,
  bills,
  subscriptions,
  linkedAccounts,
  remainingCount,
  totalCount,
  onSaved,
  onReviewNext,
}: {
  open: boolean;
  onClose: () => void;
  transaction: MoneyTransaction | null;
  bills: Bill[];
  subscriptions: Subscription[];
  linkedAccounts: LinkedAccount[];
  remainingCount: number;
  totalCount: number;
  onSaved?: (transaction: MoneyTransaction) => void;
  onReviewNext?: () => void;
}) {
  if (!transaction) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Review transaction"
      description={`${remainingCount} of ${totalCount} remaining`}
      className="sm:max-w-xl"
    >
      <TransactionReviewForm
        key={transaction.id}
        transaction={transaction}
        bills={bills}
        subscriptions={subscriptions}
        linkedAccounts={linkedAccounts}
        onClose={onClose}
        onSaved={onSaved}
        onReviewNext={onReviewNext}
      />
    </Dialog>
  );
}

function TransactionReviewForm({
  transaction,
  bills,
  subscriptions,
  linkedAccounts,
  onClose,
  onSaved,
  onReviewNext,
}: {
  transaction: MoneyTransaction;
  bills: Bill[];
  subscriptions: Subscription[];
  linkedAccounts: LinkedAccount[];
  onClose: () => void;
  onSaved?: (transaction: MoneyTransaction) => void;
  onReviewNext?: () => void;
}) {
  const toast = useToast();
  const { submitReview } = useTransactionReview();
  const [selectedCategory, setSelectedCategory] = useState<string>(
    transaction.userConfirmedCategory ??
      domainCategoryToReview(transaction.category),
  );
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiResult, setAiResult] = useState<ClassifyTransactionOutput | null>(
    null,
  );
  const [createRule, setCreateRule] = useState(false);
  const [dismissMatch, setDismissMatch] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const reconciliation = useMemo(() => {
    return reconcileTransactionWithObligations({
      transaction,
      bills,
      subscriptions,
    });
  }, [transaction, bills, subscriptions]);

  const runAiSuggest = async () => {
    setAiLoading(true);
    setAiError(null);
    try {
      const res = await fetch("/api/ai/classify-transaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          merchantName: transaction.merchantName,
          description: transaction.description,
          amount: transaction.amount,
          currentCategory: transaction.category,
          date: transaction.date,
          direction: transaction.amount >= 0 ? "inflow" : "outflow",
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error ?? "Could not suggest category.");
      }
      setAiResult(data as ClassifyTransactionOutput);
    } catch (error) {
      setAiError(
        error instanceof Error ? error.message : "Could not suggest category.",
      );
    } finally {
      setAiLoading(false);
    }
  };

  const persist = async (
    payload: TransactionReviewPayload,
    successMessage: string,
    options?: { reviewNext?: boolean },
  ) => {
    setSaving(true);
    setSaveError(null);
    try {
      const result = await submitReview(transaction.id, {
        ...payload,
        merchantPattern: transaction.merchantName || transaction.description,
        createRule: payload.createRule ?? createRule,
      });
      if (!result.ok || !result.transaction) {
        throw new Error(result.error ?? "Could not save review decision.");
      }
      toast(successMessage);
      onSaved?.(result.transaction);
      if (options?.reviewNext && onReviewNext) {
        onReviewNext();
      } else {
        onClose();
      }
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : "Could not save review decision.",
      );
    } finally {
      setSaving(false);
    }
  };

  const aiReviewCategory = aiResult
    ? domainCategoryToReview(aiResult.suggestedCategory)
    : null;

  return (
    <div className="space-y-5 text-sm">
        <div className="rounded-[var(--radius-md)] border border-border bg-muted/20 p-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="font-semibold">{transaction.merchantName}</p>
              <p className="text-xs text-muted-foreground">
                {transaction.description}
              </p>
            </div>
            <p
              className={`text-base font-medium num ${
                transaction.amount >= 0 ? "text-success" : ""
              }`}
            >
              {transaction.amount >= 0 ? "+" : "-"}
              {formatCurrency(Math.abs(transaction.amount), true)}
            </p>
          </div>
          <dl className="mt-3 grid gap-1.5 text-xs text-muted-foreground sm:grid-cols-2">
            <div>
              <dt className="inline">Date: </dt>
              <dd className="inline text-foreground">
                {formatDate(transaction.date)}
              </dd>
            </div>
            <div>
              <dt className="inline">Account: </dt>
              <dd className="inline text-foreground">
                {accountLabel(transaction.accountId, linkedAccounts)}
              </dd>
            </div>
            <div>
              <dt className="inline">Current state: </dt>
              <dd className="inline">
                <StatusBadge
                  label={currentStateLabel(transaction, bills, subscriptions)}
                  tone={
                    transaction.needsReview ||
                    transaction.classification === "review"
                      ? "warning"
                      : "success"
                  }
                />
              </dd>
            </div>
            {transaction.plaidCategoryPrimary ? (
              <div>
                <dt className="inline">Plaid category: </dt>
                <dd className="inline text-foreground">
                  {transaction.plaidCategoryPrimary}
                  {transaction.plaidCategoryDetailed
                    ? ` · ${transaction.plaidCategoryDetailed}`
                    : ""}
                </dd>
              </div>
            ) : null}
          </dl>
        </div>

        {reconciliation && !dismissMatch ? (
          <div className="space-y-2 rounded-[var(--radius-md)] border border-info/30 bg-info/5 p-3">
            <p className="flex items-center gap-2 text-xs font-medium text-info">
              <Link2 className="size-3.5" />
              Reconciliation matches
            </p>
            {reconciliation.bill ? (
              <p className="text-xs">
                Matches existing bill:{" "}
                <strong>{reconciliation.bill.name}</strong>
              </p>
            ) : null}
            {reconciliation.subscription ? (
              <p className="text-xs">
                Matches existing subscription:{" "}
                <strong>{reconciliation.subscription.name}</strong>
              </p>
            ) : null}
            {reconciliation.transferLikelihood !== "low" ? (
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <ArrowRightLeft className="size-3.5" />
                Transfer / internal movement likelihood:{" "}
                <strong>{reconciliation.transferLikelihood}</strong>
              </p>
            ) : null}
            {!reconciliation.bill && !reconciliation.subscription ? (
              <p className="text-xs text-muted-foreground">
                No bill or subscription match detected.
              </p>
            ) : null}
            <div className="flex flex-wrap gap-2 pt-1">
              {reconciliation.bill ? (
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={saving}
                  onClick={() =>
                    void persist(
                      {
                        action: "link_bill",
                        linkedBillId: reconciliation.bill!.id,
                      },
                      `Linked to bill: ${reconciliation.bill!.name}.`,
                    )
                  }
                >
                  Link to bill
                </Button>
              ) : null}
              {reconciliation.subscription ? (
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={saving}
                  onClick={() =>
                    void persist(
                      {
                        action: "link_subscription",
                        linkedSubscriptionId: reconciliation.subscription!.id,
                      },
                      `Linked to subscription: ${reconciliation.subscription!.name}.`,
                    )
                  }
                >
                  Link to subscription
                </Button>
              ) : null}
              {(reconciliation.bill || reconciliation.subscription) && (
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={saving}
                  onClick={() => setDismissMatch(true)}
                >
                  Not a match
                </Button>
              )}
            </div>
          </div>
        ) : null}

        <div className="space-y-2">
          <label
            htmlFor="review-category"
            className="text-xs font-medium text-muted-foreground"
          >
            Category
          </label>
          <select
            id="review-category"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full rounded-[var(--radius-md)] border border-border bg-background px-3 py-2 text-sm"
          >
            {REVIEW_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
          <Button
            size="sm"
            disabled={saving}
            onClick={() =>
              void persist(
                { action: "manual_category", category: selectedCategory },
                `Transaction categorized as ${selectedCategory}.`,
              )
            }
          >
            Save category
          </Button>
        </div>

        <div className="rounded-[var(--radius-md)] border border-border p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="flex items-center gap-2 text-xs font-medium">
              <Sparkles className="size-3.5 text-primary" />
              AI suggestion
            </p>
            <Button
              size="sm"
              variant="secondary"
              disabled={aiLoading || saving}
              onClick={() => void runAiSuggest()}
            >
              {aiLoading ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                "Suggest"
              )}
            </Button>
          </div>
          {aiError ? (
            <p className="mt-2 text-xs text-destructive">{aiError}</p>
          ) : null}
          {aiResult ? (
            <div className="mt-3 space-y-2 text-xs">
              <p>
                Suggested:{" "}
                <strong>{aiReviewCategory ?? aiResult.suggestedCategory}</strong>
              </p>
              <p className="text-muted-foreground">{aiResult.reason}</p>
              <label className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  checked={createRule}
                  onChange={(e) => setCreateRule(e.target.checked)}
                  className="size-3.5 rounded border-border"
                />
                Apply this category to future matching transactions
              </label>
              <Button
                size="sm"
                disabled={saving}
                onClick={() =>
                  void persist(
                    {
                      action: "accept_ai",
                      aiCategory: aiReviewCategory ?? undefined,
                      category: aiReviewCategory ?? selectedCategory,
                      createRule,
                    },
                    `Transaction categorized as ${aiReviewCategory ?? aiResult.suggestedCategory}.`,
                  )
                }
              >
                Accept suggestion
              </Button>
            </div>
          ) : (
            <p className="mt-2 text-xs text-muted-foreground">{AI_DISCLAIMER}</p>
          )}
        </div>

        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">
            Other actions
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="secondary"
              disabled={saving}
              onClick={() =>
                void persist(
                  { action: "transfer" },
                  "Marked as transfer / internal movement.",
                )
              }
            >
              Transfer / internal
            </Button>
            <Button
              size="sm"
              variant="secondary"
              disabled={saving}
              onClick={() =>
                void persist({ action: "refund" }, "Marked as refund / return.")
              }
            >
              Refund / return
            </Button>
            <Button
              size="sm"
              variant="secondary"
              disabled={saving}
              onClick={() =>
                void persist({ action: "income" }, "Marked as income.")
              }
            >
              Income
            </Button>
            <Button
              size="sm"
              variant="secondary"
              disabled={saving}
              onClick={() =>
                void persist(
                  { action: "not_recurring", category: selectedCategory },
                  "Marked as not recurring.",
                )
              }
            >
              Not recurring
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={saving}
              onClick={() =>
                void persist(
                  { action: "leave_unresolved" },
                  "Left for later review.",
                  { reviewNext: false },
                )
              }
            >
              Review later
            </Button>
          </div>
        </div>

        {saveError ? (
          <p className="text-xs text-destructive">{saveError}</p>
        ) : null}

        <div className="flex flex-wrap gap-2 border-t border-border pt-4">
          <Button
            size="sm"
            disabled={saving}
            onClick={() =>
              void persist(
                { action: "manual_category", category: selectedCategory },
                `Transaction categorized as ${selectedCategory}.`,
                { reviewNext: true },
              )
            }
          >
            Save & review next
          </Button>
          <Button size="sm" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
  );
}
