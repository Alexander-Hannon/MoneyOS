import type { DataSource } from "@/types/transactions";

/** Plaid API environment stored on PlaidItem and used for sync filtering. */
export type PlaidEnvironment = "sandbox" | "production";

export type PlaidLinkTarget = PlaidEnvironment;

export function isPlaidEnvironment(value: string): value is PlaidEnvironment {
  return value === "sandbox" || value === "production";
}

export function parsePlaidLinkTarget(value: unknown): PlaidLinkTarget | null {
  if (value === "sandbox" || value === "production") return value;
  return null;
}

/** Parse `environment` (preferred) or legacy `targetEnvironment` from a JSON body. */
export function parsePlaidEnvironmentFromBody(body: unknown): PlaidLinkTarget | null {
  if (!body || typeof body !== "object") return null;
  const record = body as Record<string, unknown>;
  return (
    parsePlaidLinkTarget(record.environment) ??
    parsePlaidLinkTarget(record.targetEnvironment)
  );
}

/** MoneyOS data source for accounts/transactions synced from Plaid. */
export function plaidSourceForEnvironment(env: PlaidEnvironment): DataSource {
  return env === "production" ? "plaid_live" : "plaid_sandbox";
}

export function environmentForDataSource(source: DataSource): PlaidEnvironment | null {
  if (source === "plaid_live") return "production";
  if (source === "plaid_sandbox") return "sandbox";
  return null;
}

export function plaidEnvironmentLabel(env: PlaidEnvironment): string {
  return env === "production" ? "Personal Live" : "Sandbox";
}
