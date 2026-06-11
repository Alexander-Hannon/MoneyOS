import type { FinancialEstimates } from "@/lib/types/money";

// Manual, mock estimates used for the cashflow trend. These are NOT pulled from
// any live account — they're placeholder figures AJ can adjust by hand.
export const mockFinancials: FinancialEstimates = {
  manual: true,
  monthlyIncomeEstimate: 3200,
  monthlySpendingEstimate: 2450,
  note: "Manual estimate — not connected to live accounts",
};
