import {
  Banknote,
  CalendarClock,
  Repeat,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/StatusBadge";
import type {
  Account,
  Alert,
  Bill,
  IncomeSource,
  Subscription,
} from "@/lib/types/money";
import {
  billsDueWithin,
  computeDashboardStatus,
  describeStatus,
  expectedIncomeWithin,
  formatCurrency,
  hasHighSeverityReview,
  monthlyRecurringCost,
  overdueUnpaidCount,
  reviewCount,
  toneForDashboardStatus,
  totalCashAvailable,
} from "@/lib/money-utils";

function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  hint?: string;
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
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
    </Card>
  );
}

export function MoneySnapshot({
  accounts,
  bills,
  income,
  subscriptions,
  alerts,
}: {
  accounts: Account[];
  bills: Bill[];
  income: IncomeSource[];
  subscriptions: Subscription[];
  alerts: Alert[];
}) {
  const cash = totalCashAvailable(accounts);
  const due = billsDueWithin(bills, 14);
  const incoming = expectedIncomeWithin(income, 14);
  const recurring = monthlyRecurringCost(bills, subscriptions);
  const reviews = reviewCount(bills, subscriptions);

  const status = computeDashboardStatus({
    cashAvailable: cash,
    billsDue14: due.total,
    incomeExpected14: incoming.total,
    overdueUnpaid: overdueUnpaidCount(bills),
    hasHighSeverityReview: hasHighSeverityReview(alerts),
    reviewItems: reviews,
  });

  return (
    <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
      <StatCard
        label="Total cash available"
        value={formatCurrency(cash)}
        hint={`${accounts.filter((a) => a.accessible).length} accessible accounts`}
        icon={Banknote}
        accent="text-primary"
      />
      <StatCard
        label="Bills due (14 days)"
        value={formatCurrency(due.total)}
        hint={`${due.count} bill${due.count === 1 ? "" : "s"}${
          due.variableCount ? ` · ${due.variableCount} variable` : ""
        }`}
        icon={CalendarClock}
        accent="text-warning"
      />
      <StatCard
        label="Income (14 days)"
        value={formatCurrency(incoming.total)}
        hint={`${incoming.count} source${incoming.count === 1 ? "" : "s"} expected`}
        icon={TrendingUp}
        accent="text-success"
      />
      <StatCard
        label="Monthly recurring"
        value={formatCurrency(recurring)}
        hint="bills + subscriptions"
        icon={Repeat}
        accent="text-info"
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
            {describeStatus(status)}
          </p>
        </div>
      </Card>
    </section>
  );
}
