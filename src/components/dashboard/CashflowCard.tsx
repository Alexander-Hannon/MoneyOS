import { LineChart } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { CashflowChart } from "@/components/dashboard/CashflowChart";
import { cashflowTrend } from "@/lib/money-utils";
import type { FinancialEstimates } from "@/lib/types/money";

export function CashflowCard({ financials }: { financials: FinancialEstimates }) {
  const data = cashflowTrend(
    financials.monthlyIncomeEstimate,
    financials.monthlySpendingEstimate,
  );

  return (
    <Card>
      <CardContent className="pt-5">
        <SectionHeader
          icon={LineChart}
          title="Cashflow Trend"
          description={financials.note}
          meta={
            <span className="flex items-center gap-3">
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
