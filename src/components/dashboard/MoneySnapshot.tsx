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
import type { PlaidEnvironment } from "@/lib/plaid/plaid-env";
import type {
  Account,
  Alert,
  Bill,
  IncomeSource,
  Subscription,
} from "@/types/money";
import type { DashboardSummary, IncomeSummary } from "@/lib/data-source";
import {
  cashAvailableHint,
  confirmedMonthlyObligationsHint,
  incomeDetectedHint,
  transactionReviewLabel,
} from "@/lib/plaid-ui-labels";
import {
  describeStatus,
  formatCurrency,
  toneForDashboardStatus,
} from "@/lib/money-utils";

const CASH_LIKE_TYPES = new Set(["checking", "savings", "cash"]);

export function MoneySnapshot({
  accounts,
  summary,
  incomeSummary,
  plaidConnected,
  storedMode,
  activePlaidEnvironment = null,
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
  activePlaidEnvironment?: PlaidEnvironment | null;
}) {
  const status = summary.status;
  const label = summary.label;
  const accessibleAccounts = accounts.filter((a) => a.accessible);
  const depositoryAccounts = accounts.filter((a) =>
    CASH_LIKE_TYPES.has(a.type),
  );

  const cashBadge = (() => {
    switch (summary.cashDataSource) {
      case "plaid_live":
        return "Live bank data";
      case "plaid_sandbox":
        return "Plaid sandbox data";
      case "mixed":
        return accounts.some((a) => a.source === "plaid_live")
          ? "Manual + live bank"
          : "Manual + Plaid sandbox";
      case "demo":
        return "Demo data";
      case "manual":
        return "Manual accounts";
      default:
        return "Add cash accounts";
    }
  })();

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
        hint={cashAvailableHint({
          accessibleCount: accessibleAccounts.length,
          cashDataSource: summary.cashDataSource,
          plaidConnected,
          hasDepositoryAccounts: depositoryAccounts.length > 0,
        })}
        icon={Banknote}
        accent="text-primary"
        badge={cashBadge}
        destinationKey="cash_available"
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
        hint={incomeDetectedHint({
          environment: activePlaidEnvironment,
          manualSourceCount: summary.income14.count,
          plaidIncomeDetected: incomeSummary.sandboxDetected,
        })}
        icon={TrendingUp}
        accent="text-success"
        badge={label}
        sectionId="income"
      />
      <ClickableStatCard
        layout="vertical"
        label="Confirmed monthly obligations"
        value={formatCurrency(summary.monthlyRecurring)}
        hint={confirmedMonthlyObligationsHint(
          summary.recurringBreakdown.detectedCandidatesExcludedTotal,
        )}
        icon={Repeat}
        accent="text-info"
        badge={label}
        destinationKey="recurring_obligations"
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
            {transactionReviewLabel(
              activePlaidEnvironment,
              summary.transactionReviewCount,
            )}
          </p>
        )}
      </ClickableStatusCard>
    </section>
  );
}
