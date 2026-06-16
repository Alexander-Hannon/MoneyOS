// SERVER-ONLY Plaid client setup.
//
// SAFETY:
// - This module reads PLAID_SECRET / PLAID_CLIENT_ID from server-side env only.
// - NEVER import this file from a client component. It is only used inside
//   `src/app/api/plaid/*` route handlers (server).
// - The PLAID_SECRET must never be sent to the browser.
// - Access tokens are encrypted before database persistence in live mode.

import { Configuration, PlaidApi, PlaidEnvironments } from "plaid";
import type { PlaidEnvironment } from "@/lib/plaid/plaid-env";

export interface PlaidConfig {
  clientId: string;
  secret: string;
  env: string;
  products: string[];
  countryCodes: string[];
}

function trimEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value || undefined;
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

function resolveSecretForEnvironment(target: PlaidEnvironment): string | null {
  const config = getPlaidConfig();
  if (!config) return null;

  if (target === "sandbox") {
    return trimEnv("PLAID_SANDBOX_SECRET") ?? config.secret;
  }

  return config.secret;
}

/** Build a PlaidApi client for a specific API environment. */
export function getPlaidClientForEnvironment(
  target: PlaidEnvironment,
): PlaidApi | null {
  const config = getPlaidConfig();
  const secret = resolveSecretForEnvironment(target);
  if (!config || !secret) return null;

  const basePath =
    PlaidEnvironments[target] ?? PlaidEnvironments.sandbox;

  const configuration = new Configuration({
    basePath,
    baseOptions: {
      headers: {
        "PLAID-CLIENT-ID": config.clientId,
        "PLAID-SECRET": secret,
      },
    },
  });

  return new PlaidApi(configuration);
}

/** Build a PlaidApi client using PLAID_ENV, or null if not configured. */
export function getPlaidClient(): PlaidApi | null {
  const config = getPlaidConfig();
  if (!config) return null;

  const env =
    config.env === "production" ? "production" : ("sandbox" as const);
  return getPlaidClientForEnvironment(env);
}

/** Safe message extraction for error responses (no secrets leaked). */
export function describePlaidError(error: unknown): string {
  const parsed = parsePlaidApiError(error);
  if (parsed.plaidErrorMessage) return parsed.plaidErrorMessage;
  if (error instanceof Error) return error.message;
  return "Unknown Plaid error";
}

export type ParsedPlaidApiError = {
  plaidErrorType: string | null;
  plaidErrorCode: string | null;
  plaidErrorMessage: string | null;
  requestId: string | null;
};

/** Extract structured Plaid API error fields without leaking secrets. */
export function parsePlaidApiError(error: unknown): ParsedPlaidApiError {
  const empty: ParsedPlaidApiError = {
    plaidErrorType: null,
    plaidErrorCode: null,
    plaidErrorMessage: null,
    requestId: null,
  };

  if (typeof error !== "object" || error === null) return empty;

  const response = (error as { response?: { data?: Record<string, unknown> } })
    .response;
  const data = response?.data;
  if (!data || typeof data !== "object") return empty;

  return {
    plaidErrorType:
      typeof data.error_type === "string" ? data.error_type : null,
    plaidErrorCode:
      typeof data.error_code === "string" ? data.error_code : null,
    plaidErrorMessage:
      typeof data.error_message === "string"
        ? data.error_message
        : typeof data.display_message === "string"
          ? data.display_message
          : null,
    requestId: typeof data.request_id === "string" ? data.request_id : null,
  };
}

/** Log Plaid errors server-side without printing secrets. */
export function logPlaidError(context: string, error: unknown): void {
  const parsed = parsePlaidApiError(error);
  console.error(`[plaid] ${context}`, {
    plaidErrorType: parsed.plaidErrorType,
    plaidErrorCode: parsed.plaidErrorCode,
    plaidErrorMessage: parsed.plaidErrorMessage,
    requestId: parsed.requestId,
    message: error instanceof Error ? error.message : "unknown",
  });
}
