import {
  CalendarClock,
  ClipboardCheck,
  Repeat,
  TrendingUp,
} from "lucide-react";
import { ClickableStatCard } from "@/components/shared/ClickableStatCard";
import type { AppMode } from "@/types/app-mode";
import type { PlaidEnvironment } from "@/lib/plaid/plaid-env";
import type {
  Bill,
  IncomeSource,
  Subscription,
} from "@/types/money";
import type { DataSourceLabel } from "@/lib/data-source";
import { reviewItemsBadgeLabel } from "@/lib/plaid-ui-labels";
import { approvedSubscriptionsMonthlyTotal } from "@/lib/recurring-obligations";
import {
  activeIncomeCount,
  billsDueThisMonth,
  formatCurrency,
} from "@/lib/money-utils";

export function SummaryCards({
  bills,
  income,
  subscriptions,
  reviewCount = 0,
  dataLabel,
  plaidConnected = false,
  storedMode = "local_user",
  activePlaidEnvironment = null,
}: {
  bills: Bill[];
  income: IncomeSource[];
  subscriptions: Subscription[];
  reviewCount?: number;
  dataLabel?: DataSourceLabel;
  plaidConnected?: boolean;
  storedMode?: AppMode;
  activePlaidEnvironment?: PlaidEnvironment | null;
}) {
  const subsTotal = approvedSubscriptionsMonthlyTotal(subscriptions);
  const thisMonth = billsDueThisMonth(bills);
  const activeCount = activeIncomeCount(income);

  const manualBadge =
    storedMode === "demo"
      ? "Demo data"
      : dataLabel === "Empty — add your data"
        ? "Local user data"
        : "Local user data";

  const reviewHint =
    reviewCount === 0 ? "all clear" : "need a decision";

  const reviewBadge = reviewItemsBadgeLabel({
    plaidConnected,
    environment: activePlaidEnvironment,
    dataLabel,
    manualBadge,
  });

  return (
    <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <ClickableStatCard
        icon={Repeat}
        label="Monthly subscriptions"
        value={formatCurrency(subsTotal, true)}
        hint={`${subscriptions.length} services`}
        accent="text-info"
        badge={dataLabel ?? manualBadge}
        sectionId="subscriptions"
      />
      <ClickableStatCard
        icon={CalendarClock}
        label="Bills due this month"
        value={formatCurrency(thisMonth.total)}
        hint={`${thisMonth.count} bill${thisMonth.count === 1 ? "" : "s"}`}
        accent="text-warning"
        badge={manualBadge}
        sectionId="bills"
      />
      <ClickableStatCard
        icon={ClipboardCheck}
        label="Review items"
        value={String(reviewCount)}
        hint={reviewHint}
        accent="text-destructive"
        badge={reviewBadge}
        sectionId="alerts"
      />
      <ClickableStatCard
        icon={TrendingUp}
        label="Income sources"
        value={String(income.length)}
        hint={`${activeCount} active now`}
        accent="text-success"
        badge={manualBadge}
        sectionId="income"
      />
    </section>
  );
}
