import {
  Banknote,
  CalendarClock,
  Repeat,
  TrendingUp,
} from "lucide-react";
import {
  ClickableStatCard,
  ClickableStatusCard,
} from "@/components/shared/ClickableStatCard";
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

export function MoneySnapshot({
  accounts,
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
  const status = summary.status;
  const label = summary.label;

  const cashBadge =
    summary.cashDataSource === "plaid_sandbox"
      ? "Plaid sandbox data"
      : summary.cashDataSource === "mixed"
        ? "Manual + Plaid sandbox"
        : summary.cashDataSource === "demo"
          ? "Demo data"
          : summary.cashDataSource === "manual"
            ? "Manual accounts"
            : "Add cash accounts";

  const statusDescription =
    status === "Setup Needed"
      ? describeStatus(status)
      : summary.isEmpty && !plaidConnected
        ? "Add bills or connect accounts to activate insights."
        : describeStatus(status);

  return (
    <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
      <ClickableStatCard
        layout="vertical"
        label="Total cash available"
        value={formatCurrency(summary.cashAvailable)}
        hint={
          accounts.filter((a) => a.accessible).length === 0
            ? "No cash accounts added yet."
            : `${accounts.filter((a) => a.accessible).length} accessible account${accounts.filter((a) => a.accessible).length === 1 ? "" : "s"}`
        }
        icon={Banknote}
        accent="text-primary"
        badge={cashBadge}
        sectionId="accounts"
      />
      <ClickableStatCard
        layout="vertical"
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
        sectionId="bills"
      />
      <ClickableStatCard
        layout="vertical"
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
        sectionId="income"
      />
      <ClickableStatCard
        layout="vertical"
        label="Monthly recurring"
        value={formatCurrency(summary.monthlyRecurring)}
        hint="bills + subscriptions + sandbox recurring"
        icon={Repeat}
        accent="text-info"
        badge={label}
        sectionId="recurring-detected"
      />
      <ClickableStatusCard
        label="Current status"
        sectionId="action-center"
        className="col-span-2 lg:col-span-1"
      >
        <StatusBadge
          label={status}
          tone={toneForDashboardStatus(status)}
          className="px-3 py-1 text-sm"
        />
        <p className="mt-1.5 text-xs text-muted-foreground">
          {statusDescription}
        </p>
        {summary.cashDataSource === "missing" && !plaidConnected && (
          <span className="mt-1 inline-block text-xs text-primary">
            Add accounts →
          </span>
        )}
        {summary.transactionReviewCount > 0 && plaidConnected && (
          <p className="mt-1 text-[10px] text-warning">
            {summary.transactionReviewCount} sandbox transaction
            {summary.transactionReviewCount === 1 ? "" : "s"} need classification
          </p>
        )}
      </ClickableStatusCard>
    </section>
  );
}
