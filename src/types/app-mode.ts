/** How MoneyOS loads manual/local financial data. */
export type AppMode =
  | "demo"
  | "local_user"
  | "plaid_sandbox"
  | "personal_live";

export type OnboardingChoice = "fresh" | "demo" | "connect_sandbox";

export type ModeDisplayLabel =
  | "Demo Mode"
  | "Local User Data"
  | "Plaid Sandbox"
  | "Personal Live";
