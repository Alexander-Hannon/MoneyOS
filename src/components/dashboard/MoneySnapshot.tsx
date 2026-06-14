import {
  Banknote,
  CalendarClock,
  Repeat,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/StatusBadge";
import type { AppMode } from "@/types/app-mode";
import type {
  Account,
  Alert,
  Bill,
  IncomeSource,
  Subscription,
} from "@/types/money";
import type { DashboardSummary, IncomeSummary } from "@/lib/data-source";
import {
  describeStatus,
  formatCurrency,
  toneForDashboardStatus,
} from "@/lib/money-utils";

function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  accent,
  badge,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  accent: string;
  badge?: string;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        <Icon className={`size-4 shrink-0 ${accent}`} />
      </div>
      <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight">
        {value}
      </p>
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
      {badge && (
        <p className="mt-1 text-[10px] font-medium uppercase tracking-wide text-info/80">
          {badge}
        </p>
      )}
    </Card>
  );
}

export function MoneySnapshot({
  accounts,
  bills,
  income,
  subscriptions,
  alerts,
  summary,
  incomeSummary,
  plaidConnected,
  storedMode,
}: {
  accounts: Account[];
  bills: Bill[];
  income: IncomeSource[];
  subscriptions: Subscription[];
  alerts: Alert[];
  summary: DashboardSummary;
  incomeSummary: IncomeSummary;
  plaidConnected: boolean;
  storedMode: AppMode;
}) {
  void bills;
  void income;
  void subscriptions;
  void alerts;

  const status = summary.status;
  const label = summary.label;

  const cashBadge = plaidConnected
    ? "Plaid sandbox data"
    : storedMode === "demo"
      ? "Demo data"
      : summary.isEmpty
        ? "Empty — add accounts"
        : "Local user data";

  return (
    <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
      <StatCard
        label="Total cash available"
        value={formatCurrency(summary.cashAvailable)}
        hint={`${accounts.filter((a) => a.accessible).length} accessible accounts`}
        icon={Banknote}
        accent="text-primary"
        badge={cashBadge}
      />
      <StatCard
        label="Bills due (14 days)"
        value={formatCurrency(summary.billsDue14.total)}
        hint={`${summary.billsDue14.count} bill${summary.billsDue14.count === 1 ? "" : "s"}${
          summary.billsDue14.variableCount
            ? ` · ${summary.billsDue14.variableCount} variable`
            : ""
        }`}
        icon={CalendarClock}
        accent="text-warning"
        badge={storedMode === "demo" ? "Demo data" : "Local user data"}
      />
      <StatCard
        label="Income (14 days)"
        value={formatCurrency(summary.income14.total)}
        hint={
          incomeSummary.sandboxDetected
            ? `${summary.income14.count} manual source${summary.income14.count === 1 ? "" : "s"} · sandbox income detected`
            : `${summary.income14.count} source${summary.income14.count === 1 ? "" : "s"} expected`
        }
        icon={TrendingUp}
        accent="text-success"
        badge={label}
      />
      <StatCard
        label="Monthly recurring"
        value={formatCurrency(summary.monthlyRecurring)}
        hint="bills + subscriptions + sandbox recurring"
        icon={Repeat}
        accent="text-info"
        badge={label}
      />
      <Card className="col-span-2 flex flex-col justify-between p-4 lg:col-span-1">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Current status
        </span>
        <div className="mt-2">
          <StatusBadge
            label={status}
            tone={toneForDashboardStatus(status)}
            className="px-3 py-1 text-sm"
          />
          <p className="mt-1.5 text-xs text-muted-foreground">
            {summary.isEmpty && !plaidConnected
              ? "Add bills or connect accounts to activate insights."
              : describeStatus(status)}
          </p>
          {summary.transactionReviewCount > 0 && plaidConnected && (
            <p className="mt-1 text-[10px] text-warning">
              {summary.transactionReviewCount} sandbox transaction
              {summary.transactionReviewCount === 1 ? "" : "s"} need classification
            </p>
          )}
        </div>
      </Card>
    </section>
  );
}
