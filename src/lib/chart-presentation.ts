import {
  chartSourceLabel,
  type ChartDataSource,
  type ChartPresentation,
} from "@/lib/chart-data";
import {
  currentMonthCashflowSnapshot,
  hasEnoughCashflowHistory,
  type CashflowTrendPoint,
} from "@/lib/chart-trends";

export type ChartPresentationInfo = {
  kind: ChartPresentation;
  label: string;
  description: string;
};

export function resolveChartPresentationInfo(args: {
  chartDataSource: ChartDataSource;
  trendPoints: CashflowTrendPoint[];
}): ChartPresentationInfo {
  const { chartDataSource, trendPoints } = args;

  if (chartDataSource === "manual_projection") {
    return {
      kind: "manual_projection",
      label: "Manual projection",
      description: chartSourceLabel("manual_projection"),
    };
  }

  if (chartDataSource === "live") {
    if (hasEnoughCashflowHistory(trendPoints)) {
      return {
        kind: "historical_trend",
        label: "Live bank transaction history",
        description:
          "Actual transaction history — income and spending grouped by month from real transaction dates.",
      };
    }
    if (currentMonthCashflowSnapshot(trendPoints)) {
      return {
        kind: "live_current_month",
        label: "Live bank transaction history",
        description:
          "Current month snapshot from live transactions. Not enough live history yet — MoneyOS will build this trend as transactions sync.",
      };
    }
    return {
      kind: "live_insufficient_history",
      label: "Live bank transaction history",
      description:
        "Not enough live history yet. MoneyOS will build this trend as transactions sync.",
    };
  }

  if (hasEnoughCashflowHistory(trendPoints)) {
    return {
      kind: "historical_trend",
      label:
        chartDataSource === "demo"
          ? "Demo data"
          : chartDataSource === "plaid_sandbox"
            ? "Plaid sandbox transaction history"
            : "Actual transaction history",
      description: chartSourceLabel(chartDataSource),
    };
  }

  return {
    kind: "empty_state",
    label: "No cashflow history",
    description: chartSourceLabel(chartDataSource),
  };
}
