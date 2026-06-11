import { Repeat } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import {
  formatCurrency,
  monthlyAmountForSubscription,
  toneForSubscriptionStatus,
} from "@/lib/money-utils";
import type { Subscription } from "@/lib/types/money";

export function SubscriptionWatchlist({
  subscriptions,
}: {
  subscriptions: Subscription[];
}) {
  const monthlyTotal = subscriptions.reduce(
    (sum, s) => sum + monthlyAmountForSubscription(s),
    0,
  );
  const flagged = subscriptions.filter((s) => s.status === "review").length;

  return (
    <Card>
      <CardContent className="pt-5">
        <SectionHeader
          icon={Repeat}
          title="Subscription Watchlist"
          description="Recurring software and services"
          meta={`${formatCurrency(monthlyTotal, true)}/mo · ${flagged} to review`}
        />
        <ul className="space-y-2">
          {subscriptions.map((sub) => (
            <li
              key={sub.id}
              className="flex items-center justify-between gap-3 rounded-[var(--radius-md)] border border-border/60 bg-muted/20 px-3.5 py-3"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-medium">{sub.name}</p>
                  <StatusBadge
                    label={sub.status}
                    tone={toneForSubscriptionStatus(sub.status)}
                  />
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {sub.category}
                  {sub.notes ? ` · ${sub.notes}` : ""}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-sm font-semibold tabular-nums">
                  {formatCurrency(sub.amount, true)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {sub.frequency === "annually" ? "per year" : "per month"}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
