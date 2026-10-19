"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowDownRight,
  ArrowUpRight,
  ClipboardList,
  CreditCard,
  Info,
  Landmark,
  Repeat,
  Sparkles,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CashflowChart } from "@/components/dashboard/CashflowChart";
import {
  SpendingByCategoryChart,
  categoryColors,
} from "@/components/spending/SpendingByCategoryChart";
import { ConnectBankCard } from "@/components/spending/ConnectBankCard";
import { PlaidStatusCard } from "@/components/spending/PlaidStatusCard";
import { TransactionClassificationReview } from "@/components/spending/TransactionClassificationReview";
import { TransactionReviewDrawer } from "@/components/spending/TransactionReviewDrawer";
import { useFinancialData } from "@/hooks/useFinancialData";
import { shouldShowLiveConnectPrimary } from "@/hooks/usePlaidConnection";
import { resolveChartPresentationInfo } from "@/lib/chart-presentation";
import { resolveCashflowTrend } from "@/lib/chart-trends";
import { resolveChartDataSource } from "@/lib/chart-data";
import {
  spendingEmptyTitle,
  spendingTransactionsHint,
} from "@/lib/plaid-ui-labels";
import { formatCurrency, formatDate } from "@/lib/money-utils";
import {
  buildSpendingAlerts,
  recentTransactions,
  recurringChargeCandidates,
  spendingByCategory,
  topMerchants,
  transactionsNeedingReview,
  transferPaymentTotal,
} from "@/lib/transaction-utils";
import { reviewStateLabel } from "@/lib/transaction-review/categories";

function StatTile({
  label,
  value,
  hint,
  icon: Icon,
  accent,
  title,
  onClick,
}: {
  label: string;
  value: string;
  hint: string;
  icon: LucideIcon;
  accent: string;
  title?: string;
  onClick?: () => void;
}) {
  const content = (
    <>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">
          {label}
        </span>
        <Icon className={`size-4 ${accent}`} />
      </div>
      <p className="mt-2 text-2xl font-medium num tracking-tight">
        {value}
      </p>
      <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        title={title}
        className="rounded-[var(--radius)] border border-border bg-card p-4 text-left transition-colors hover:border-primary/40 hover:bg-accent/30"
      >
        {content}
      </button>
    );
  }

  return (
    <Card className="p-4" title={title}>
      {content}
    </Card>
  );
}

const alertTone = { low: "info", medium: "warning", high: "danger" } as const;

export function SpendingDashboard() {
  const fd = useFinancialData();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeFilter = searchParams.get("filter");
  const classificationFilterActive =
    activeFilter === "needs-classification" && pathname === "/spending";
  const usingPlaid = fd.plaidConnected;
  const txns = fd.transactions;
  const hasData = txns.length > 0;
  const showLiveEmptyLabel = shouldShowLiveConnectPrimary({
    livePlaidEnabled: fd.livePlaidEnabled,
    liveUserAllowed: fd.liveUserAllowed,
    storedMode: fd.storedMode,
  });
  const [showTransferNote, setShowTransferNote] = useState(true);
  const [recentReviewId, setRecentReviewId] = useState<string | null>(null);

  const spending = fd.spendingSummary.monthlySpending;
  const income = fd.spendingSummary.monthlyIncome;
  const byCategory = useMemo(() => spendingByCategory(txns), [txns]);
  const merchants = useMemo(() => topMerchants(txns, 5), [txns]);
  const recent = useMemo(() => recentTransactions(txns, 8), [txns]);
  const review = useMemo(() => transactionsNeedingReview(txns), [txns]);
  const recurring = useMemo(() => recurringChargeCandidates(txns), [txns]);
  const alerts = useMemo(() => buildSpendingAlerts(txns), [txns]);
  const excludedTransfers = transferPaymentTotal(txns);

  const chartDataSource = resolveChartDataSource({
    storedMode: fd.storedMode,
    plaidConnected: usingPlaid,
    activePlaidEnvironment: fd.activePlaidEnvironment,
    transactions: txns,
    hasManualIncomeOrBills:
      fd.income.length > 0 || fd.bills.length > 0 || fd.subscriptions.length > 0,
  });
  const allowSyntheticFallback =
    chartDataSource === "demo" || chartDataSource === "plaid_sandbox";
  const trendPoints = useMemo(
    () =>
      resolveCashflowTrend({
        transactions: txns,
        allowSyntheticFallback,
      }),
    [txns, allowSyntheticFallback],
  );
  const trendPresentation = useMemo(
    () =>
      resolveChartPresentationInfo({
        chartDataSource,
        trendPoints,
      }),
    [chartDataSource, trendPoints],
  );
  const trend = useMemo(
    () =>
      trendPoints.map(({ month, income, spending }) => ({
        month,
        income,
        spending,
      })),
    [trendPoints],
  );

  const sourceLabel = usingPlaid
    ? fd.activePlaidEnvironment === "production"
      ? "Personal live data — real bank data"
      : fd.plaidStorageMode === "database"
        ? "Plaid sandbox data — persisted to database (encrypted tokens server-side)"
        : "Plaid sandbox data — not live bank data"
    : fd.storedMode === "demo"
      ? "Demo data — sample transactions for exploration"
      : showLiveEmptyLabel
        ? "Personal live data — connect real bank"
        : "Local user data — add accounts or connect Plaid sandbox";

  const reviewAmount = fd.spendingSummary.reviewAmount;

  const clearClassificationFilter = () => {
    router.push("/spending");
  };

  return (
    <Card className="min-w-0">
      <CardContent className="min-w-0 space-y-5 pt-5">
        <SectionHeader
          icon={Wallet}
          title="Spending"
          description="Transactions, categories, and trends"
          meta={
            <span
              className={`rounded-[3px] border px-2.5 py-1 text-[11px] font-medium ${
                usingPlaid
                  ? fd.activePlaidEnvironment === "production"
                    ? "border-warning/30 bg-warning/10 text-warning"
                    : "border-info/30 bg-info/10 text-info"
                  : showLiveEmptyLabel
                    ? "border-warning/30 bg-warning/10 text-warning"
                    : "border-border bg-muted/40 text-muted-foreground"
              }`}
            >
              {sourceLabel}
            </span>
          }
        />

        <div className="grid gap-4 lg:grid-cols-2">
          <ConnectBankCard />
          <PlaidStatusCard />
        </div>

        {usingPlaid && excludedTransfers > 0 && showTransferNote && (
          <div className="flex items-start gap-2 rounded-[var(--radius-md)] border border-border bg-muted/20 p-3 text-xs text-muted-foreground">
            <Info className="mt-0.5 size-4 shrink-0 text-info" />
            <p className="flex-1">
              Transfers, credit card payments, loan payments, and deposits (
              {formatCurrency(excludedTransfers, true)}) are excluded from monthly
              spending totals.
            </p>
            <button
              type="button"
              className="text-[10px] text-muted-foreground/70 hover:text-foreground"
              onClick={() => setShowTransferNote(false)}
            >
              Dismiss
            </button>
          </div>
        )}

        {usingPlaid && fd.linkedAccounts.length > 0 && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {fd.linkedAccounts.map((a) => (
              <div
                key={a.id}
                className="flex items-center gap-3 rounded-[var(--radius-md)] border border-border bg-muted/20 p-3"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-info/10 text-info">
                  <Landmark className="size-4" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {a.name}
                    {a.mask ? ` ••${a.mask}` : ""}
                  </p>
                  <p className="text-xs capitalize text-muted-foreground">
                    {a.type}
                    {a.currentBalance != null
                      ? ` · ${formatCurrency(a.currentBalance, true)}`
                      : ""}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {usingPlaid && !hasData ? (
          <EmptyState
            icon={CreditCard}
            title={spendingEmptyTitle(fd.activePlaidEnvironment)}
            description={
              fd.activePlaidEnvironment === "production"
                ? "Live transactions can take a moment to appear. Use Sync in the header to refresh."
                : "Sandbox transactions can take a moment to generate. Use Sync in the header to try again."
            }
          />
        ) : (
          <>
            {classificationFilterActive ? (
              <div className="flex flex-wrap items-center gap-2 rounded-[var(--radius-md)] border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning">
                <span className="font-medium">Filter: Needs classification</span>
                <button
                  type="button"
                  className="text-warning/80 underline-offset-2 hover:underline"
                  onClick={clearClassificationFilter}
                >
                  Clear filter
                </button>
              </div>
            ) : null}

            <TransactionClassificationReview
              transactions={txns}
              active={classificationFilterActive}
              onClearFilter={clearClassificationFilter}
            />

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatTile
                label="Monthly spending"
                value={formatCurrency(spending)}
                hint="debit purchases only · this month"
                icon={ArrowDownRight}
                accent="text-destructive"
              />
              <StatTile
                label="Income (this month)"
                value={formatCurrency(income)}
                hint={
                  usingPlaid
                    ? spendingTransactionsHint(fd.activePlaidEnvironment)
                    : "mock transactions"
                }
                icon={ArrowUpRight}
                accent="text-success"
              />
              <StatTile
                label="Needs classification"
                value={String(review.length)}
                hint={
                  review.length
                    ? `${formatCurrency(reviewAmount, true)} uncategorized`
                    : "all clear"
                }
                icon={ClipboardList}
                accent="text-warning"
                title="Review includes uncategorized transactions that may need manual classification. Transfers and payments are excluded."
                onClick={
                  review.length > 0
                    ? () => router.push("/spending?filter=needs-classification")
                    : undefined
                }
              />
              <StatTile
                label="Recurring charges"
                value={String(recurring.length)}
                hint="subscription-like"
                icon={Repeat}
                accent="text-info"
              />
            </div>

            <div className="grid min-w-0 gap-5 lg:grid-cols-2">
              <div className="min-w-0 rounded-[var(--radius)] border border-border bg-card p-5">
                <p className="mb-2 text-sm font-medium">Spending by category</p>
                {byCategory.length > 0 ? (
                  <>
                    <div className="min-w-0">
                      <SpendingByCategoryChart data={byCategory} />
                    </div>
                    <ul className="mt-3 space-y-1.5">
                      {byCategory.slice(0, 6).map((c, i) => (
                        <li
                          key={c.category}
                          className="flex items-center justify-between text-sm"
                        >
                          <span className="flex items-center gap-2 text-muted-foreground">
                            <span
                              className="size-2.5 rounded-full"
                              style={{
                                background:
                                  categoryColors[i % categoryColors.length],
                              }}
                            />
                            {c.category}
                          </span>
                          <span className="num">
                            {formatCurrency(c.total, true)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">No spending yet.</p>
                )}
              </div>

              <div className="min-w-0 rounded-[var(--radius)] border border-border bg-card p-5">
                <p className="mb-3 text-sm font-medium">Top merchants</p>
                {merchants.length > 0 ? (
                  <ul className="space-y-2">
                    {merchants.map((m) => (
                      <li
                        key={m.name}
                        className="flex items-center justify-between rounded-[var(--radius-md)] border border-border/60 bg-muted/20 px-3 py-2"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{m.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {m.count} transaction{m.count === 1 ? "" : "s"}
                          </p>
                        </div>
                        <span className="text-sm font-medium num">
                          {formatCurrency(m.total, true)}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">No merchants yet.</p>
                )}
              </div>
            </div>

            <div className="min-w-0 rounded-[var(--radius)] border border-border bg-card p-5">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium">Income vs spending</p>
                <span className="text-[11px] text-muted-foreground">
                  {trendPresentation.label}
                </span>
              </div>
              {trendPresentation.kind === "live_insufficient_history" ? (
                <p className="text-sm text-muted-foreground">
                  {trendPresentation.description}
                </p>
              ) : trendPresentation.kind === "live_current_month" ? (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    {trendPresentation.description}
                  </p>
                  {trend.length > 0 ? (
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-muted-foreground">Income</p>
                        <p className="font-semibold text-success">
                          {formatCurrency(trend[trend.length - 1]?.income ?? 0)}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Spending</p>
                        <p className="font-semibold text-destructive">
                          {formatCurrency(trend[trend.length - 1]?.spending ?? 0)}
                        </p>
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : trend.length >= 2 ? (
                <div className="min-w-0">
                  <CashflowChart data={trend} />
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {trendPresentation.description}
                </p>
              )}
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              <div className="rounded-[var(--radius)] border border-border bg-card p-5">
                <p className="mb-3 text-sm font-medium">Recent transactions</p>
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
                    {recent.map((t) => {
                      const needsReview =
                        t.classification === "review" && t.needsReview;
                      const displayCategory = needsReview
                        ? "Review"
                        : (t.userConfirmedCategory ??
                          reviewStateLabel(t.reviewState, {
                            linkedBillName: t.linkedBillId
                              ? fd.bills.find((b) => b.id === t.linkedBillId)
                                  ?.name
                              : null,
                            linkedSubscriptionName: t.linkedSubscriptionId
                              ? fd.subscriptions.find(
                                  (s) => s.id === t.linkedSubscriptionId,
                                )?.name
                              : null,
                          }));

                      return (
                      <TableRow key={t.id}>
                        <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                          {formatDate(t.date)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap font-medium">
                          {t.merchantName}
                          {t.pending && (
                            <span className="ml-1.5 text-xs text-muted-foreground">
                              (pending)
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <StatusBadge
                            label={displayCategory}
                            tone={needsReview ? "warning" : "neutral"}
                          />
                          {needsReview ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="ml-1 h-auto px-1 py-0 text-[10px] text-primary"
                              onClick={() => setRecentReviewId(t.id)}
                            >
                              Review
                            </Button>
                          ) : null}
                        </TableCell>
                        <TableCell
                          className={`text-right num whitespace-nowrap ${
                            t.amount >= 0 ? "text-success" : ""
                          }`}
                        >
                          {t.amount >= 0 ? "+" : "-"}
                          {formatCurrency(Math.abs(t.amount), true)}
                        </TableCell>
                      </TableRow>
                    );})}
                  </TableBody>
                </Table>
              </div>

              <div className="space-y-5">
                <div className="rounded-[var(--radius)] border border-border bg-card p-5">
                  <p className="mb-3 flex items-center gap-2 text-sm font-medium">
                    <Sparkles className="size-4 text-primary" /> Spending alerts
                  </p>
                  {alerts.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No spending alerts.
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {alerts.map((a) => (
                        <li
                          key={a.id}
                          className="rounded-[var(--radius-md)] border border-border/60 bg-muted/20 p-2.5"
                        >
                          <div className="flex items-center gap-2">
                            <StatusBadge
                              label={a.severity}
                              tone={alertTone[a.severity]}
                            />
                            <p className="text-sm font-medium">{a.title}</p>
                          </div>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {a.description}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="rounded-[var(--radius)] border border-border bg-card p-5">
                  <p className="mb-3 flex items-center gap-2 text-sm font-medium">
                    <CreditCard className="size-4 text-info" /> Recurring charge
                    candidates
                  </p>
                  {recurring.length === 0 ? (
                    <EmptyState
                      icon={Repeat}
                      title="No recurring charges detected"
                    />
                  ) : (
                    <ul className="space-y-1.5">
                      {recurring.map((t) => (
                        <li
                          key={t.id}
                          className="flex items-center justify-between text-sm"
                        >
                          <span className="text-muted-foreground">
                            {t.merchantName}
                          </span>
                          <span className="num">
                            {formatCurrency(Math.abs(t.amount), true)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>

      <TransactionReviewDrawer
        open={recentReviewId != null}
        onClose={() => setRecentReviewId(null)}
        transaction={txns.find((t) => t.id === recentReviewId) ?? null}
        bills={fd.bills}
        subscriptions={fd.subscriptions}
        linkedAccounts={fd.linkedAccounts}
        remainingCount={review.length}
        totalCount={review.length}
      />
    </Card>
  );
}
