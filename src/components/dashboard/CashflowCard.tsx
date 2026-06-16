import { LineChart } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/EmptyState";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { CashflowChart } from "@/components/dashboard/CashflowChart";
import { ManualMonthlyProjectionCard } from "@/components/dashboard/ManualMonthlyProjectionCard";
import {
  chartSourceLabel,
  type ChartDataSource,
  type ChartPresentation,
  type ManualMonthlyProjection,
} from "@/lib/chart-data";

type TrendPoint = { month: string; income: number; spending: number };

export function CashflowCard({
  presentation,
  chartDataSource,
  trendData,
  projection,
}: {
  presentation: ChartPresentation;
  chartDataSource: ChartDataSource;
  trendData?: TrendPoint[];
  projection?: ManualMonthlyProjection | null;
}) {
  const description = chartSourceLabel(chartDataSource);

  if (presentation === "manual_projection" && projection) {
    return <ManualMonthlyProjectionCard projection={projection} />;
  }

  if (presentation === "empty_state") {
    return (
      <Card>
        <CardContent className="pt-5">
          <SectionHeader
            icon={LineChart}
            title="Cashflow history"
            description={description}
          />
          <EmptyState
            icon={LineChart}
            title="No cashflow history yet."
            description="Add transactions or connect an account to build a real trend."
          />
        </CardContent>
      </Card>
    );
  }

  if (presentation === "live_placeholder") {
    return (
      <Card>
        <CardContent className="pt-5">
          <SectionHeader icon={LineChart} title="Cashflow history" description={description} />
          <EmptyState
            icon={LineChart}
            title="Live transaction history"
            description="Live mode is disabled in this build."
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
          title="Cashflow trend"
          description={description}
          meta={
            chartDataSource === "demo" ? (
              <span className="rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                Demo trend
              </span>
            ) : chartDataSource === "plaid_sandbox" ? (
              <span className="rounded-full border border-info/30 bg-info/10 px-2 py-0.5 text-[10px] font-medium text-info">
                Plaid sandbox
              </span>
            ) : null
          }
        />
        {trendData && trendData.length > 0 ? (
          <div className="min-w-0">
            <CashflowChart data={trendData} />
          </div>
        ) : (
          <EmptyState
            icon={LineChart}
            title="No cashflow history yet."
            description="Add transactions or connect an account to build a real trend."
          />
        )}
      </CardContent>
    </Card>
  );
}
