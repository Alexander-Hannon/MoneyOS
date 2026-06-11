import {
  CalendarClock,
  ClipboardCheck,
  Repeat,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import type {
  Bill,
  IncomeSource,
  Subscription,
} from "@/lib/types/money";
import {
  billsDueThisMonth,
  formatCurrency,
  monthlySubscriptionTotal,
  reviewCount,
  upcomingIncomeSources,
} from "@/lib/money-utils";

function MiniCard({
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
      </div>
    </Card>
  );
}

export function SummaryCards({
  bills,
  income,
  subscriptions,
}: {
  bills: Bill[];
  income: IncomeSource[];
  subscriptions: Subscription[];
}) {
  const subsTotal = monthlySubscriptionTotal(subscriptions);
  const thisMonth = billsDueThisMonth(bills);
  const reviews = reviewCount(bills, subscriptions);
  const upcoming = upcomingIncomeSources(income);

  return (
    <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <MiniCard
        icon={Repeat}
        label="Monthly subscriptions"
        value={formatCurrency(subsTotal, true)}
        hint={`${subscriptions.length} services`}
        accent="text-info"
      />
      <MiniCard
        icon={CalendarClock}
        label="Bills due this month"
        value={formatCurrency(thisMonth.total)}
        hint={`${thisMonth.count} bill${thisMonth.count === 1 ? "" : "s"}`}
        accent="text-warning"
      />
      <MiniCard
        icon={ClipboardCheck}
        label="Review items"
        value={String(reviews)}
        hint={reviews === 0 ? "all clear" : "need a decision"}
        accent="text-destructive"
      />
      <MiniCard
        icon={TrendingUp}
        label="Income sources"
        value={String(upcoming.length)}
        hint={`${income.filter((i) => i.active).length} active now`}
        accent="text-success"
      />
    </section>
  );
}
