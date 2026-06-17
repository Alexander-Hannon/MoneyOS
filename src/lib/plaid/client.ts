// SERVER-ONLY Plaid client setup.
//
// SAFETY:
// - This module reads Plaid credentials from server-side env only.
// - NEVER import this file from a client component.
// - Secrets must never be sent to the browser.

import { Configuration, PlaidApi } from "plaid";
import type { PlaidEnvironment } from "@/lib/plaid/plaid-env";
import {
  canResolvePlaidCredentials,
  resolvePlaidCredentials,
  type PlaidRoutingDebug,
  toPlaidRoutingDebug,
} from "@/lib/plaid/credential-routing";

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

/** Returns the default Plaid config snapshot, or null when base credentials are missing. */
export function getPlaidConfig(): PlaidConfig | null {
  const clientId = trimEnv("PLAID_CLIENT_ID");
  const secret = trimEnv("PLAID_SECRET");
  if (!clientId || !secret) return null;

  return {
    clientId,
    secret,
    env: trimEnv("PLAID_ENV") ?? "sandbox",
    products: (trimEnv("PLAID_PRODUCTS") ?? "transactions")
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean),
    countryCodes: (trimEnv("PLAID_COUNTRY_CODES") ?? "US")
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean),
  };
}

export function isPlaidConfigured(): boolean {
  return (
    canResolvePlaidCredentials("sandbox") ||
    canResolvePlaidCredentials("production")
  );
}

/** Build a PlaidApi client for a specific API environment. */
export function getPlaidClientForEnvironment(
  target: PlaidEnvironment,
): PlaidApi | null {
  const creds = resolvePlaidCredentials(target);
  if (!creds) return null;

  const configuration = new Configuration({
    basePath: creds.basePath,
    baseOptions: {
      headers: {
        "PLAID-CLIENT-ID": creds.clientId,
        "PLAID-SECRET": creds.secret,
      },
    },
  });

  return new PlaidApi(configuration);
}

export function getPlaidRoutingDebug(
  target: PlaidEnvironment,
): PlaidRoutingDebug {
  return toPlaidRoutingDebug(target, resolvePlaidCredentials(target));
}

/** Build a PlaidApi client using PLAID_ENV, or null if not configured. */
export function getPlaidClient(): PlaidApi | null {
  const env = trimEnv("PLAID_ENV") ?? "sandbox";
  const target = env === "production" ? "production" : "sandbox";
  return getPlaidClientForEnvironment(target);
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

export {
  canResolvePlaidCredentials,
  resolvePlaidCredentials,
  selfTestPlaidCredentialRouting,
  toPlaidRoutingDebug,
  type PlaidRoutingDebug,
  type PlaidSecretSource,
} from "@/lib/plaid/credential-routing";
