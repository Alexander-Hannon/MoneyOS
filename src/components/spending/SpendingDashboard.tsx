import {
  ArrowDownRight,
  ArrowUpRight,
  ClipboardList,
  CreditCard,
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
import { mockTransactions } from "@/lib/data/mock-transactions";
import { formatCurrency, formatDate } from "@/lib/money-utils";
import {
  buildSpendingAlerts,
  incomeVsSpendingTrend,
  monthlyIncomeTotal,
  monthlySpendingTotal,
  recentTransactions,
  recurringChargeCandidates,
  spendingByCategory,
  topMerchants,
  transactionsNeedingReview,
} from "@/lib/transaction-utils";
import type { SpendingAlert } from "@/types/transactions";

function StatTile({
  label,
  value,
  hint,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  hint: string;
  icon: LucideIcon;
  accent: string;
}) {
  return (
    <Card className="p-4">
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
  const txns = mockTransactions;
  const spending = monthlySpendingTotal(txns);
  const income = monthlyIncomeTotal(txns);
  const byCategory = spendingByCategory(txns);
  const merchants = topMerchants(txns, 5);
  const recent = recentTransactions(txns, 8);
  const review = transactionsNeedingReview(txns);
  const recurring = recurringChargeCandidates(txns);
  const alerts: SpendingAlert[] = buildSpendingAlerts(txns);
  const trend = incomeVsSpendingTrend(txns);

  return (
    <Card>
      <CardContent className="space-y-5 pt-5">
        <SectionHeader
          icon={Wallet}
          title="Spending"
          description="Transactions, categories, and trends"
          meta={
            <span className="rounded-full border border-border bg-muted/40 px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
              Manual / mock data — not connected to live accounts
            </span>
          }
        />

        <ConnectBankCard />

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatTile
            label="Monthly spending"
            value={formatCurrency(spending)}
            hint={`${txns.length} transactions`}
            icon={ArrowDownRight}
            accent="text-destructive"
          />
          <StatTile
            label="Income (this month)"
            value={formatCurrency(income)}
            hint="mock transactions"
            icon={ArrowUpRight}
            accent="text-success"
          />
          <StatTile
            label="Needs review"
            value={String(review.length)}
            hint={review.length ? "uncategorized" : "all clear"}
            icon={ClipboardList}
            accent="text-warning"
          />
          <StatTile
            label="Recurring charges"
            value={String(recurring.length)}
            hint="subscription-like"
            icon={Repeat}
            accent="text-info"
          />
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <div className="rounded-[var(--radius)] border border-border bg-card p-5">
            <p className="mb-2 text-sm font-medium">Spending by category</p>
            <SpendingByCategoryChart data={byCategory} />
            <ul className="mt-3 space-y-1.5">
              {byCategory.slice(0, 6).map((c, i) => (
                <li
                  key={c.category}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <span
                      className="size-2.5 rounded-full"
                      style={{ background: categoryColors[i % categoryColors.length] }}
                    />
                    {c.category}
                  </span>
                  <span className="tabular-nums">{formatCurrency(c.total, true)}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-[var(--radius)] border border-border bg-card p-5">
            <p className="mb-3 text-sm font-medium">Top merchants</p>
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
          </div>
        </div>

        <div className="rounded-[var(--radius)] border border-border bg-card p-5">
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
          <CashflowChart data={trend} />
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
                {recent.map((t) => (
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
                        label={t.category}
                        tone={t.needsReview ? "warning" : "neutral"}
                      />
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
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="space-y-5">
            <div className="rounded-[var(--radius)] border border-border bg-card p-5">
              <p className="mb-3 flex items-center gap-2 text-sm font-medium">
                <Sparkles className="size-4 text-primary" /> Spending alerts
              </p>
              {alerts.length === 0 ? (
                <p className="text-sm text-muted-foreground">No spending alerts.</p>
              ) : (
                <ul className="space-y-2">
                  {alerts.map((a) => (
                    <li
                      key={a.id}
                      className="rounded-[var(--radius-md)] border border-border/60 bg-muted/20 p-2.5"
                    >
                      <div className="flex items-center gap-2">
                        <StatusBadge label={a.severity} tone={alertTone[a.severity]} />
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
                <EmptyState icon={Repeat} title="No recurring charges detected" />
              ) : (
                <ul className="space-y-1.5">
                  {recurring.map((t) => (
                    <li
                      key={t.id}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-muted-foreground">{t.merchantName}</span>
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
      </CardContent>
    </Card>
  );
}
