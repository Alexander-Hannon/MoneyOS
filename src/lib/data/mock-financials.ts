import type { FinancialEstimates } from "@/types/money";

// Demo manual estimates for the cashflow trend — not live account data.
export const mockFinancials: FinancialEstimates = {
  manual: true,
  monthlyIncomeEstimate: 3200,
  monthlySpendingEstimate: 2450,
  note: "Demo manual estimate — not connected to live accounts",
};
