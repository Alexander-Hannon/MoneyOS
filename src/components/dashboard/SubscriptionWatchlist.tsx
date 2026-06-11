import { Repeat, TriangleAlert, ArrowUpRight, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  daysUntil,
  formatCurrency,
  formatRelativeDays,
  monthlyAmount,
  monthlySubscriptions,
} from "@/lib/finance";
import type { Subscription } from "@/lib/types";

function flag(sub: Subscription) {
  if (sub.trialEndsAt) {
    return (
      <Badge variant="warning">
        <Clock className="size-3" /> Trial ends {formatRelativeDays(daysUntil(sub.trialEndsAt))}
      </Badge>
    );
  }
  if (sub.usage === "unused") {
    return (
      <Badge variant="destructive">
        <TriangleAlert className="size-3" /> Unused
      </Badge>
    );
  }
  if (sub.priceIncrease) {
    return (
      <Badge variant="info">
        <ArrowUpRight className="size-3" /> +{formatCurrency(sub.priceIncrease)}
      </Badge>
    );
  }
  if (sub.usage === "occasional") return <Badge variant="secondary">Occasional</Badge>;
  return <Badge variant="success">Active</Badge>;
}

export function SubscriptionWatchlist({ subscriptions }: { subscriptions: Subscription[] }) {
  const total = monthlySubscriptions(subscriptions);
  const flagged = subscriptions.filter(
    (s) => s.usage === "unused" || s.trialEndsAt || s.priceIncrease,
  ).length;
  const sorted = [...subscriptions].sort(
    (a, b) => monthlyAmount(b.amount, b.cadence) - monthlyAmount(a.amount, a.cadence),
  );

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-foreground">
          <Repeat className="size-4 text-info" />
          Subscription Watchlist
        </CardTitle>
        <span className="text-xs text-muted-foreground">
          {formatCurrency(total)}/mo · {flagged} flagged
        </span>
      </CardHeader>
      <CardContent className="space-y-2">
        {sorted.map((sub) => (
          <div
            key={sub.id}
            className="flex items-center justify-between gap-3 rounded-[var(--radius-md)] border border-border/60 bg-muted/20 px-3.5 py-2.5"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{sub.name}</p>
              <p className="text-xs text-muted-foreground">
                {sub.category} · renews {formatRelativeDays(daysUntil(sub.nextRenewal))}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              {flag(sub)}
              <span className="w-16 text-right text-sm font-semibold tabular-nums">
                {formatCurrency(monthlyAmount(sub.amount, sub.cadence), true)}
              </span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
