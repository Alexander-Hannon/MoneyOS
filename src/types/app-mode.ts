/** How MoneyOS loads manual/local financial data. */
export type AppMode =
  | "demo"
  | "local_user"
  | "plaid_sandbox"
  | "future_plaid_live";

export type OnboardingChoice = "fresh" | "demo" | "connect_sandbox";

export type ModeDisplayLabel =
  | "Demo Mode"
  | "Local User Data"
  | "Plaid Sandbox"
  | "Live mode disabled";
