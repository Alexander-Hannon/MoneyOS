import {
  CalendarClock,
  ClipboardCheck,
  Repeat,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import type { AppMode } from "@/types/app-mode";
import type {
  Bill,
  IncomeSource,
  Subscription,
} from "@/types/money";
import type { DataSourceLabel } from "@/lib/data-source";
import {
  activeIncomeCount,
  billsDueThisMonth,
  formatCurrency,
  monthlySubscriptionTotal,
  reviewCount,
} from "@/lib/money-utils";

function MiniCard({
  label,
  value,
  hint,
  icon: Icon,
  accent,
  badge,
}: {
  label: string;
  value: string;
  hint: string;
  icon: LucideIcon;
  accent: string;
  badge?: string;
}) {
  return (
    <Card className="flex items-center gap-3 p-4">
      <span
        className={`flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-muted ${accent}`}
      >
        <Icon className="size-5" />
      </span>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="truncate text-lg font-semibold tabular-nums leading-tight">
          {value}
        </p>
        <p className="truncate text-xs text-muted-foreground">{hint}</p>
        {badge && (
          <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-info/80">
            {badge}
          </p>
        )}
      </div>
    </Card>
  );
}

export function SummaryCards({
  bills,
  income,
  subscriptions,
  transactionReviewCount = 0,
  dataLabel,
  plaidConnected = false,
  storedMode = "local_user",
}: {
  bills: Bill[];
  income: IncomeSource[];
  subscriptions: Subscription[];
  transactionReviewCount?: number;
  dataLabel?: DataSourceLabel;
  plaidConnected?: boolean;
  storedMode?: AppMode;
}) {
  const subsTotal = monthlySubscriptionTotal(subscriptions);
  const thisMonth = billsDueThisMonth(bills);
  const reviews = reviewCount(bills, subscriptions);
  const activeCount = activeIncomeCount(income);

  const manualBadge =
    storedMode === "demo"
      ? "Demo data"
      : dataLabel === "Empty — add your data"
        ? "Local user data"
        : "Local user data";

  const reviewHint =
    transactionReviewCount > 0 && plaidConnected
      ? `${reviews} manual · ${transactionReviewCount} txn review`
      : reviews === 0
        ? "all clear"
        : "need a decision";

  return (
    <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <MiniCard
        icon={Repeat}
        label="Monthly subscriptions"
        value={formatCurrency(subsTotal, true)}
        hint={`${subscriptions.length} services`}
        accent="text-info"
        badge={dataLabel ?? manualBadge}
      />
      <MiniCard
        icon={CalendarClock}
        label="Bills due this month"
        value={formatCurrency(thisMonth.total)}
        hint={`${thisMonth.count} bill${thisMonth.count === 1 ? "" : "s"}`}
        accent="text-warning"
        badge={manualBadge}
      />
      <MiniCard
        icon={ClipboardCheck}
        label="Review items"
        value={String(reviews + (plaidConnected ? transactionReviewCount : 0))}
        hint={reviewHint}
        accent="text-destructive"
        badge={plaidConnected ? (dataLabel ?? "Plaid Sandbox") : manualBadge}
      />
      <MiniCard
        icon={TrendingUp}
        label="Income sources"
        value={String(income.length)}
        hint={`${activeCount} active now`}
        accent="text-success"
        badge={manualBadge}
      />
    </section>
  );
}
