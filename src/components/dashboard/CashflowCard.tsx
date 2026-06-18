import { LineChart } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/EmptyState";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { CashflowChart } from "@/components/dashboard/CashflowChart";
import { ManualMonthlyProjectionCard } from "@/components/dashboard/ManualMonthlyProjectionCard";
import {
  chartSourceLabel,
  type ChartDataSource,
  type ManualMonthlyProjection,
} from "@/lib/chart-data";
import type { ChartPresentationInfo } from "@/lib/chart-presentation";
import { formatCurrency } from "@/lib/money-utils";

type TrendPoint = { month: string; income: number; spending: number };

export function CashflowCard({
  presentation,
  chartDataSource,
  trendData,
  projection,
}: {
  presentation: ChartPresentationInfo;
  chartDataSource: ChartDataSource;
  trendData?: TrendPoint[];
  projection?: ManualMonthlyProjection | null;
}) {
  const { kind, label, description } = presentation;

  if (kind === "manual_projection" && projection) {
    return <ManualMonthlyProjectionCard projection={projection} />;
  }

  if (kind === "live_insufficient_history") {
    return (
      <Card>
        <CardContent className="pt-5">
          <SectionHeader
            icon={LineChart}
            title="Income vs spending"
            description={label}
          />
          <EmptyState
            icon={LineChart}
            title="Not enough live history yet"
            description={description}
          />
        </CardContent>
      </Card>
    );
  }

  if (kind === "live_current_month") {
    const point = trendData?.[trendData.length - 1];
    return (
      <Card>
        <CardContent className="pt-5">
          <SectionHeader
            icon={LineChart}
            title="Income vs spending"
            description={label}
            meta={
              <span className="rounded-full border border-warning/30 bg-warning/10 px-2 py-0.5 text-[10px] font-medium text-warning">
                Current month
              </span>
            }
          />
          <p className="mb-3 text-sm text-muted-foreground">{description}</p>
          {point ? (
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="rounded-[var(--radius-md)] border border-border bg-muted/20 p-3">
                <p className="text-xs text-muted-foreground">Income</p>
                <p className="mt-1 text-lg font-semibold tabular-nums text-success">
                  {formatCurrency(point.income)}
                </p>
              </div>
              <div className="rounded-[var(--radius-md)] border border-border bg-muted/20 p-3">
                <p className="text-xs text-muted-foreground">Spending</p>
                <p className="mt-1 text-lg font-semibold tabular-nums text-destructive">
                  {formatCurrency(point.spending)}
                </p>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    );
  }

  if (kind === "empty_state") {
    return (
      <Card>
        <CardContent className="pt-5">
          <SectionHeader
            icon={LineChart}
            title="Cashflow history"
            description={chartSourceLabel(chartDataSource)}
          />
          <EmptyState
            icon={LineChart}
            title="No cashflow history yet."
            description={description}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="min-w-0">
      <CardContent className="min-w-0 pt-5">
        <SectionHeader
          icon={LineChart}
          title="Income vs spending"
          description={label}
          meta={
            chartDataSource === "demo" ? (
              <span className="rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                Demo data
              </span>
            ) : chartDataSource === "plaid_sandbox" ? (
              <span className="rounded-full border border-info/30 bg-info/10 px-2 py-0.5 text-[10px] font-medium text-info">
                Plaid sandbox
              </span>
            ) : chartDataSource === "live" ? (
              <span className="rounded-full border border-warning/30 bg-warning/10 px-2 py-0.5 text-[10px] font-medium text-warning">
                Live bank data
              </span>
            ) : null
          }
        />
        {chartDataSource === "demo" || chartDataSource === "manual_projection" ? (
          <p className="mb-3 text-xs text-muted-foreground">{description}</p>
        ) : null}
        {trendData && trendData.length > 0 ? (
          <div className="min-w-0">
            <CashflowChart data={trendData} />
          </div>
        ) : (
          <EmptyState
            icon={LineChart}
            title="No cashflow history yet."
            description={description}
          />
        )}
      </CardContent>
    </Card>
  );
}
