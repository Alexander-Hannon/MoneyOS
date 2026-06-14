"use client";

/**
 * @deprecated Import useFinancialData from @/hooks/useFinancialData instead.
 * Kept for gradual migration of spending components.
 */
export {
  usePlaidFromFinancialData as usePlaid,
} from "@/context/FinancialDataProvider";

export type DataSource = "mock" | "plaid_sandbox";
export type ConnectionStatus = "not_connected" | "connected" | "error";

/** @deprecated PlaidProvider is now FinancialDataProvider in layout.tsx */
export function PlaidProvider({ children }: { children: React.ReactNode }) {
  return children;
}
