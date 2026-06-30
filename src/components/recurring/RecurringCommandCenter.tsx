"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import {
  CalendarClock,
  Link2,
  Repeat2,
  ShieldCheck,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { useFinancialData } from "@/hooks/useFinancialData";
import { useMoneyData } from "@/lib/storage/store";
import { useToast } from "@/components/ui/toast";
import {
  approvedSubscriptionsMonthlyTotal,
  confirmedBillsMonthlyTotal,
  computeRecurringObligationsBreakdown,
  isApprovedSubscription,
  reconciledRecurringTransactions,
} from "@/lib/recurring-obligations";
import {
  formatCurrency,
  formatDate,
  monthlyAmountForBill,
  monthlyAmountForSubscription,
} from "@/lib/money-utils";
import type { RecurringSuggestion } from "@/types/actions";
import type { Bill, Subscription } from "@/types/money";

function billDraftFromSuggestion(suggestion: RecurringSuggestion): Omit<Bill, "id"> {
  return {
    name: suggestion.name,
    amount: suggestion.detectedAmount,
    amountType: "fixed",
    dueDate: new Date().toISOString().slice(0, 10),
    frequency: "monthly",
    autopay: false,
    paidFrom: "Unassigned",
    status: "review",
    notes: `Detected from transactions (${suggestion.cadence})`,
  };
}

function subscriptionDraftFromSuggestion(
  suggestion: RecurringSuggestion,
): Omit<Subscription, "id"> {
  return {
    name: suggestion.name,
    amount: suggestion.detectedAmount,
    frequency: "monthly",
    category: suggestion.categoryGuess,
    status: "review",
    notes: `Detected from transactions (${suggestion.cadence})`,
  };
}

export function RecurringCommandCenter() {
  const fd = useFinancialData();
  const money = useMoneyData();
  const toast = useToast();
  const searchParams = useSearchParams();
  const focusDetected = searchParams.get("section") === "detected";

  const breakdown = useMemo(
    () =>
      computeRecurringObligationsBreakdown({
        bills: fd.bills,
        subscriptions: fd.subscriptions,
        recurringSuggestions: fd.recurringSuggestions,
        transactions: fd.transactions,
        plaidConnected: fd.plaidConnected,
      }),
    [fd.bills, fd.subscriptions, fd.recurringSuggestions, fd.transactions, fd.plaidConnected],
  );

  const confirmedBills = fd.bills;
  const approvedSubscriptions = fd.subscriptions.filter(isApprovedSubscription);
  const reviewSubscriptions = fd.subscriptions.filter((s) => s.status !== "keep");
  const reconciled = reconciledRecurringTransactions(fd.transactions);

  const linkTransactionToBill = async (transactionId: string, billId: string) => {
    const result = await fd.submitTransactionReview(transactionId, {
      action: "link_bill",
      linkedBillId: billId,
    });
    if (result.ok) toast("Transaction linked to bill.");
    else toast(result.error ?? "Could not link transaction.");
  };

  const linkTransactionToSubscription = async (
    transactionId: string,
    subscriptionId: string,
  ) => {
    const result = await fd.submitTransactionReview(transactionId, {
      action: "link_subscription",
      linkedSubscriptionId: subscriptionId,
    });
    if (result.ok) toast("Transaction linked to subscription.");
    else toast(result.error ?? "Could not link transaction.");
  };

  return (
    <div className="space-y-5">
      <Card>
        <CardContent className="space-y-3 pt-5">
          <SectionHeader
            icon={ShieldCheck}
            title="Monthly recurring obligations"
            description="Confirmed bills and approved subscriptions only"
          />
          <p className="text-3xl font-semibold tabular-nums">
            {formatCurrency(breakdown.totalConfirmedMonthlyObligations)}
          </p>
          <div className="grid gap-2 text-sm sm:grid-cols-2">
            <div className="rounded-[var(--radius-md)] border border-border/60 bg-muted/20 p-3">
              <p className="text-xs text-muted-foreground">Bills subtotal</p>
              <p className="font-semibold tabular-nums">
                {formatCurrency(confirmedBillsMonthlyTotal(fd.bills))}
              </p>
            </div>
            <div className="rounded-[var(--radius-md)] border border-border/60 bg-muted/20 p-3">
              <p className="text-xs text-muted-foreground">Subscriptions subtotal</p>
              <p className="font-semibold tabular-nums">
                {formatCurrency(approvedSubscriptionsMonthlyTotal(fd.subscriptions))}
              </p>
            </div>
          </div>
          {process.env.NODE_ENV !== "production" ? (
            <pre className="overflow-x-auto rounded-[var(--radius-md)] border border-border bg-muted/30 p-3 text-[10px] text-muted-foreground">
              {JSON.stringify(breakdown, null, 2)}
            </pre>
          ) : null}
          {breakdown.detectedCandidatesExcludedTotal > 0 ? (
            <p className="text-xs text-warning">
              Detected candidates:{" "}
              {formatCurrency(breakdown.detectedCandidatesExcludedTotal, true)} not
              included in this total.
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card id="confirmed-obligations">
        <CardContent className="pt-5">
          <SectionHeader
            icon={CalendarClock}
            title="Confirmed monthly obligations"
            description="Bills you track plus subscriptions marked Keep"
          />
          {confirmedBills.length === 0 && approvedSubscriptions.length === 0 ? (
            <EmptyState
              icon={CalendarClock}
              title="No confirmed obligations yet"
              description="Add bills and approve subscriptions to build your monthly obligation total."
            />
          ) : (
            <div className="space-y-4">
              {confirmedBills.length > 0 ? (
                <div>
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Bills
                  </p>
                  <ul className="space-y-2">
                    {confirmedBills.map((bill) => (
                      <li
                        key={bill.id}
                        className="rounded-[var(--radius-md)] border border-border/60 bg-muted/20 p-3 text-sm"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <p className="font-medium">{bill.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {bill.frequency}
                              {bill.dueDate
                                ? ` · due ${formatDate(bill.dueDate)}`
                                : ""}
                            </p>
                            {bill.notes ? (
                              <p className="mt-1 text-xs text-muted-foreground">
                                {bill.notes}
                              </p>
                            ) : null}
                            {bill.paymentUrl ? (
                              <a
                                href={bill.paymentUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-1 inline-block text-xs text-primary hover:underline"
                              >
                                Payment link
                              </a>
                            ) : null}
                          </div>
                          <p className="font-semibold tabular-nums">
                            {formatCurrency(monthlyAmountForBill(bill), true)}/mo
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {approvedSubscriptions.length > 0 ? (
                <div>
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Approved subscriptions
                  </p>
                  <ul className="space-y-2">
                    {approvedSubscriptions.map((sub) => (
                      <li
                        key={sub.id}
                        className="rounded-[var(--radius-md)] border border-border/60 bg-muted/20 p-3 text-sm"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <p className="font-medium">{sub.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {sub.frequency}
                              {sub.renewalDate
                                ? ` · renews ${formatDate(sub.renewalDate)}`
                                : ""}
                            </p>
                            {sub.cancellationUrl ? (
                              <a
                                href={sub.cancellationUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-1 inline-block text-xs text-primary hover:underline"
                              >
                                Manage subscription
                              </a>
                            ) : null}
                          </div>
                          <p className="font-semibold tabular-nums">
                            {formatCurrency(
                              monthlyAmountForSubscription(sub),
                              true,
                            )}
                            /mo
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {reviewSubscriptions.length > 0 ? (
                <p className="text-xs text-muted-foreground">
                  {reviewSubscriptions.length} subscription
                  {reviewSubscriptions.length === 1 ? "" : "s"} in review/cancel
                  status are excluded until marked Keep.
                </p>
              ) : null}
            </div>
          )}
        </CardContent>
      </Card>

      <Card id="detected-candidates">
        <CardContent className="pt-5">
          <SectionHeader
            icon={Repeat2}
            title="Detected recurring candidates"
            description="Not included until you confirm"
            meta={
              focusDetected ? (
                <StatusBadge label="Filtered view" tone="info" />
              ) : undefined
            }
          />
          {fd.recurringSuggestions.length === 0 ? (
            <EmptyState
              icon={Repeat2}
              title="No recurring patterns detected"
              description="Transaction history will surface repeat merchants here for review."
            />
          ) : (
            <ul className="space-y-2">
              {fd.recurringSuggestions.map((suggestion) => (
                <li
                  key={suggestion.id}
                  className="rounded-[var(--radius-md)] border border-warning/20 bg-warning/5 p-3.5"
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{suggestion.name}</p>
                        <StatusBadge label={suggestion.confidence} tone="warning" />
                        <StatusBadge label="Not confirmed" tone="neutral" />
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatCurrency(suggestion.detectedAmount)} ·{" "}
                        {suggestion.cadence}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          money.addBill(billDraftFromSuggestion(suggestion));
                          money.dismissRecurringSuggestion(suggestion.id);
                          toast(`Added ${suggestion.name} as bill`);
                        }}
                      >
                        Add as bill
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          money.addSubscription(
                            subscriptionDraftFromSuggestion(suggestion),
                          );
                          money.dismissRecurringSuggestion(suggestion.id);
                          toast(`Added ${suggestion.name} as subscription`);
                        }}
                      >
                        Add as subscription
                      </Button>
                      {fd.bills.length > 0 &&
                      suggestion.sourceTransactions[0] ? (
                        <select
                          className="rounded-[var(--radius-md)] border border-border bg-background px-2 py-1 text-xs"
                          defaultValue=""
                          onChange={(event) => {
                            const billId = event.target.value;
                            if (!billId) return;
                            void linkTransactionToBill(
                              suggestion.sourceTransactions[0],
                              billId,
                            );
                            money.dismissRecurringSuggestion(suggestion.id);
                            event.target.value = "";
                          }}
                        >
                          <option value="">Link to bill…</option>
                          {fd.bills.map((bill) => (
                            <option key={bill.id} value={bill.id}>
                              {bill.name}
                            </option>
                          ))}
                        </select>
                      ) : null}
                      {fd.subscriptions.length > 0 &&
                      suggestion.sourceTransactions[0] ? (
                        <select
                          className="rounded-[var(--radius-md)] border border-border bg-background px-2 py-1 text-xs"
                          defaultValue=""
                          onChange={(event) => {
                            const subscriptionId = event.target.value;
                            if (!subscriptionId) return;
                            void linkTransactionToSubscription(
                              suggestion.sourceTransactions[0],
                              subscriptionId,
                            );
                            money.dismissRecurringSuggestion(suggestion.id);
                            event.target.value = "";
                          }}
                        >
                          <option value="">Link to subscription…</option>
                          {fd.subscriptions.map((sub) => (
                            <option key={sub.id} value={sub.id}>
                              {sub.name}
                            </option>
                          ))}
                        </select>
                      ) : null}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          money.dismissRecurringSuggestion(suggestion.id);
                          toast("Marked not recurring");
                        }}
                      >
                        Not recurring
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          money.dismissRecurringSuggestion(suggestion.id);
                          toast("Ignored");
                        }}
                      >
                        Ignore
                      </Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card id="reconciled-activity">
        <CardContent className="pt-5">
          <SectionHeader
            icon={Link2}
            title="Reconciled activity"
            description="Transactions already linked to bills or subscriptions"
          />
          {reconciled.length === 0 ? (
            <EmptyState
              icon={Link2}
              title="No reconciled recurring activity yet"
              description="When you link transactions to existing bills or subscriptions, they appear here."
            />
          ) : (
            <ul className="space-y-2">
              {reconciled.map((txn) => {
                const bill = txn.linkedBillId
                  ? fd.bills.find((row) => row.id === txn.linkedBillId)
                  : null;
                const subscription = txn.linkedSubscriptionId
                  ? fd.subscriptions.find(
                      (row) => row.id === txn.linkedSubscriptionId,
                    )
                  : null;
                return (
                  <li
                    key={txn.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius-md)] border border-success/20 bg-success/5 p-3 text-sm"
                  >
                    <div>
                      <p className="font-medium">{txn.merchantName}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(txn.date)}
                        {bill ? ` · Linked to bill: ${bill.name}` : ""}
                        {subscription
                          ? ` · Linked to subscription: ${subscription.name}`
                          : ""}
                      </p>
                    </div>
                    <p className="font-semibold tabular-nums">
                      {formatCurrency(Math.abs(txn.amount), true)}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
