"use client";

import { useMemo, useState } from "react";
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
import { SuggestCategoryButton } from "@/components/ai/SuggestCategoryButton";
import { useFinancialData } from "@/hooks/useFinancialData";
import { formatCurrency, formatDate } from "@/lib/money-utils";
import {
  buildSpendingAlerts,
  incomeVsSpendingTrend,
  recentTransactions,
  recurringChargeCandidates,
  spendingByCategory,
  topMerchants,
  transactionsNeedingReview,
  transferPaymentTotal,
} from "@/lib/transaction-utils";
import type { TransactionCategory } from "@/types/transactions";

function StatTile({
  label,
  value,
  hint,
  icon: Icon,
  accent,
  title,
}: {
  label: string;
  value: string;
  hint: string;
  icon: LucideIcon;
  accent: string;
  title?: string;
}) {
  return (
    <Card className="p-4" title={title}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        <Icon className={`size-4 ${accent}`} />
      </div>
      <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight">
        {value}
      </p>
      <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
    </Card>
  );
}

const alertTone = { low: "info", medium: "warning", high: "danger" } as const;

export function SpendingDashboard() {
  const fd = useFinancialData();
  const usingSandbox = fd.plaidConnected;
  const txns = fd.transactions;
  const hasData = txns.length > 0;
  const [showTransferNote, setShowTransferNote] = useState(true);
  const [categoryOverrides, setCategoryOverrides] = useState<
    Record<string, TransactionCategory>
  >({});

  const spending = fd.spendingSummary.monthlySpending;
  const income = fd.spendingSummary.monthlyIncome;
  const byCategory = useMemo(() => spendingByCategory(txns), [txns]);
  const merchants = useMemo(() => topMerchants(txns, 5), [txns]);
  const recent = useMemo(() => recentTransactions(txns, 8), [txns]);
  const review = useMemo(() => transactionsNeedingReview(txns), [txns]);
  const recurring = useMemo(() => recurringChargeCandidates(txns), [txns]);
  const alerts = useMemo(() => buildSpendingAlerts(txns), [txns]);
  const trend = useMemo(() => incomeVsSpendingTrend(txns), [txns]);
  const excludedTransfers = transferPaymentTotal(txns);

  const sourceLabel = usingSandbox
    ? fd.plaidStorageMode === "database"
      ? "Plaid sandbox data — persisted to database (encrypted tokens server-side)"
      : "Plaid sandbox data — not live bank data"
    : fd.storedMode === "demo"
      ? "Demo data — sample transactions for exploration"
      : "Local user data — add accounts or connect Plaid sandbox";

  const reviewAmount = fd.spendingSummary.reviewAmount;

  return (
    <Card className="min-w-0">
      <CardContent className="min-w-0 space-y-5 pt-5">
        <SectionHeader
          icon={Wallet}
          title="Spending"
          description="Transactions, categories, and trends"
          meta={
            <span
              className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${
                usingSandbox
                  ? "border-info/30 bg-info/10 text-info"
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

        {usingSandbox && excludedTransfers > 0 && showTransferNote && (
          <div className="flex items-start gap-2 rounded-[var(--radius-md)] border border-border bg-muted/20 p-3 text-xs text-muted-foreground">
            <Info className="mt-0.5 size-4 shrink-0 text-info" />
            <p className="flex-1">
              Transfers, credit card payments, loan payments, and deposits (
              {formatCurrency(excludedTransfers, true)}) are excluded from monthly
              spending totals.
            </p>
            <button
              type="button"
              className="text-[10px] uppercase tracking-wide text-muted-foreground/70 hover:text-foreground"
              onClick={() => setShowTransferNote(false)}
            >
              Dismiss
            </button>
          </div>
        )}

        {usingSandbox && fd.linkedAccounts.length > 0 && (
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

        {usingSandbox && !hasData ? (
          <EmptyState
            icon={CreditCard}
            title="No sandbox transactions yet"
            description="Sandbox transactions can take a moment to generate. Use “Sync transactions” in the header to try again."
          />
        ) : (
          <>
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
                hint={usingSandbox ? "sandbox inflows" : "mock transactions"}
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
                          <span className="tabular-nums">
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
                        <span className="text-sm font-semibold tabular-nums">
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
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-medium">Income vs spending</p>
                <span className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-primary" /> Income
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-destructive" /> Spending
                  </span>
                </span>
              </div>
              {trend.length > 0 ? (
                <div className="min-w-0">
                  <CashflowChart data={trend} />
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No trend data yet.</p>
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
                      const displayCategory =
                        categoryOverrides[t.id] ??
                        (t.classification === "review" ? "Review" : t.category);
                      const needsReview =
                        t.classification === "review" && !categoryOverrides[t.id];

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
                          {needsReview && (
                            <SuggestCategoryButton
                              transaction={t}
                              onApprove={(cat) =>
                                setCategoryOverrides((prev) => ({
                                  ...prev,
                                  [t.id]: cat,
                                }))
                              }
                            />
                          )}
                        </TableCell>
                        <TableCell
                          className={`text-right tabular-nums whitespace-nowrap ${
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
                          <span className="tabular-nums">
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
    </Card>
  );
}
