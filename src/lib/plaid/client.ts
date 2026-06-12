// SERVER-ONLY Plaid client setup.
//
// SAFETY:
// - This module reads PLAID_SECRET / PLAID_CLIENT_ID from server-side env only.
// - NEVER import this file from a client component. It is only used inside
//   `src/app/api/plaid/*` route handlers (server).
// - The PLAID_SECRET must never be sent to the browser.
// - We intentionally do NOT persist access tokens anywhere in this phase.

import { Configuration, PlaidApi, PlaidEnvironments } from "plaid";

export interface PlaidConfig {
  clientId: string;
  secret: string;
  env: string;
  products: string[];
  countryCodes: string[];
}

/** Returns the Plaid config, or null when env vars are missing. */
export function getPlaidConfig(): PlaidConfig | null {
  const clientId = process.env.PLAID_CLIENT_ID;
  const secret = process.env.PLAID_SECRET;
  if (!clientId || !secret) return null;

  return {
    clientId,
    secret,
    env: process.env.PLAID_ENV ?? "sandbox",
    products: (process.env.PLAID_PRODUCTS ?? "transactions")
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean),
    countryCodes: (process.env.PLAID_COUNTRY_CODES ?? "US")
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean),
  };
}

export function isPlaidConfigured(): boolean {
  return getPlaidConfig() !== null;
}

/** Build a PlaidApi client, or null if not configured. */
export function getPlaidClient(): PlaidApi | null {
  const config = getPlaidConfig();
  if (!config) return null;

  const basePath =
    PlaidEnvironments[config.env] ?? PlaidEnvironments.sandbox;

  const configuration = new Configuration({
    basePath,
    baseOptions: {
      headers: {
        "PLAID-CLIENT-ID": config.clientId,
        "PLAID-SECRET": config.secret,
      },
    },
  });

  return new PlaidApi(configuration);
}

/** Safe message extraction for error responses (no secrets leaked). */
export function describePlaidError(error: unknown): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    typeof (error as { response?: unknown }).response === "object"
  ) {
    const data = (error as { response?: { data?: { error_message?: string } } })
      .response?.data;
    if (data?.error_message) return data.error_message;
  }
  if (error instanceof Error) return error.message;
  return "Unknown Plaid error";
}
