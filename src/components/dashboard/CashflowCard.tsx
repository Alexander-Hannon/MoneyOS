import { LineChart } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { CashflowChart } from "@/components/dashboard/CashflowChart";
import { cashflowTrend } from "@/lib/money-utils";
import type { FinancialEstimates } from "@/types/money";

export function CashflowCard({
  financials,
  plaidConnected = false,
  monthlyIncome,
  monthlySpending,
  chartData,
}: {
  financials: FinancialEstimates;
  plaidConnected?: boolean;
  monthlyIncome?: number;
  monthlySpending?: number;
  chartData?: { month: string; income: number; spending: number }[];
}) {
  const income = monthlyIncome ?? financials.monthlyIncomeEstimate;
  const spending = monthlySpending ?? financials.monthlySpendingEstimate;
  const data =
    chartData ?? cashflowTrend(income, spending);

  const description = plaidConnected
    ? "Based on Plaid sandbox transactions this month — not live data."
    : financials.note;

  return (
    <Card>
      <CardContent className="pt-5">
        <SectionHeader
          icon={LineChart}
          title="Cashflow Trend"
          description={description}
          meta={
            <span className="flex flex-wrap items-center gap-3">
              {plaidConnected && (
                <span className="rounded-full border border-info/30 bg-info/10 px-2 py-0.5 text-[10px] font-medium text-info">
                  Plaid sandbox data
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-primary" /> Income
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-destructive" /> Spending
              </span>
            </span>
          }
        />
        <CashflowChart data={data} />
      </CardContent>
    </Card>
  );
}
