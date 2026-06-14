import { Calculator } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { formatCurrency } from "@/lib/money-utils";
import type { ManualMonthlyProjection } from "@/lib/chart-data";

export function ManualMonthlyProjectionCard({
  projection,
}: {
  projection: ManualMonthlyProjection;
}) {
  const surplusTone =
    projection.projectedSurplus >= 0 ? "text-success" : "text-destructive";

  return (
    <Card>
      <CardContent className="pt-5">
        <SectionHeader
          icon={Calculator}
          title="Manual monthly projection"
          description="Manual projection — not historical transaction data."
          meta={
            <span className="rounded-full border border-warning/30 bg-warning/10 px-2 py-0.5 text-[10px] font-medium text-warning">
              Projection only
            </span>
          }
        />
        <dl className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-[var(--radius-md)] border border-border bg-muted/20 p-3">
            <dt className="text-xs text-muted-foreground">Expected monthly income</dt>
            <dd className="mt-1 text-lg font-semibold tabular-nums text-success">
              {formatCurrency(projection.expectedMonthlyIncome)}
            </dd>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {projection.incomeSourceCount} active source
              {projection.incomeSourceCount === 1 ? "" : "s"}
            </p>
          </div>
          <div className="rounded-[var(--radius-md)] border border-border bg-muted/20 p-3">
            <dt className="text-xs text-muted-foreground">Expected monthly obligations</dt>
            <dd className="mt-1 text-lg font-semibold tabular-nums text-destructive">
              {formatCurrency(projection.expectedMonthlyObligations)}
            </dd>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {projection.billCount} bill{projection.billCount === 1 ? "" : "s"} ·{" "}
              {projection.subscriptionCount} subscription
              {projection.subscriptionCount === 1 ? "" : "s"}
            </p>
          </div>
          <div className="rounded-[var(--radius-md)] border border-border bg-muted/20 p-3">
            <dt className="text-xs text-muted-foreground">Projected surplus / deficit</dt>
            <dd className={`mt-1 text-lg font-semibold tabular-nums ${surplusTone}`}>
              {formatCurrency(projection.projectedSurplus)}
            </dd>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Based on manual income and bills
            </p>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}
