import { PlaidEnvironments } from "plaid";
import type { PlaidEnvironment } from "@/lib/plaid/plaid-env";

export type PlaidSecretSource =
  | "PLAID_SECRET"
  | "PLAID_SANDBOX_SECRET"
  | "PLAID_PRODUCTION_SECRET"
  | "missing";

export type ResolvedPlaidCredentials = {
  targetEnvironment: PlaidEnvironment;
  basePath: string;
  clientId: string;
  secret: string;
  secretSource: PlaidSecretSource;
  clientIdLast4: string;
  secretLength: number;
};

export type PlaidRoutingDebug = {
  requestedEnvironment: PlaidEnvironment;
  resolvedPlaidHost: string | null;
  secretSource: PlaidSecretSource;
  clientIdLast4: string | null;
  secretLength: number;
};

type EnvReader = (name: string) => string | undefined;

function readTrimmedEnv(readEnv: EnvReader, name: string): string | undefined {
  const value = readEnv(name)?.trim();
  return value || undefined;
}

function last4(value: string): string {
  return value.length <= 4 ? value : value.slice(-4);
}

function hostFromEnvironment(target: PlaidEnvironment): string {
  return PlaidEnvironments[target] ?? PlaidEnvironments.sandbox;
}

/**
 * Resolve Plaid host + secret for a link/sync target.
 *
 * Production: production host + PLAID_PRODUCTION_SECRET or PLAID_SECRET (never sandbox secret).
 * Sandbox: sandbox host + PLAID_SANDBOX_SECRET, or PLAID_SECRET only when PLAID_ENV=sandbox.
 */
export function resolvePlaidCredentialsFromEnv(
  readEnv: EnvReader,
  target: PlaidEnvironment,
): ResolvedPlaidCredentials | null {
  const clientId = readTrimmedEnv(readEnv, "PLAID_CLIENT_ID");
  if (!clientId) return null;

  const plaidEnv = readTrimmedEnv(readEnv, "PLAID_ENV") ?? "sandbox";

  if (target === "production") {
    const productionSecret =
      readTrimmedEnv(readEnv, "PLAID_PRODUCTION_SECRET") ??
      readTrimmedEnv(readEnv, "PLAID_SECRET");
    if (!productionSecret) return null;

    const secretSource: PlaidSecretSource = readTrimmedEnv(
      readEnv,
      "PLAID_PRODUCTION_SECRET",
    )
      ? "PLAID_PRODUCTION_SECRET"
      : "PLAID_SECRET";

    return {
      targetEnvironment: "production",
      basePath: hostFromEnvironment("production"),
      clientId,
      secret: productionSecret,
      secretSource,
      clientIdLast4: last4(clientId),
      secretLength: productionSecret.length,
    };
  }

  const sandboxSecret = readTrimmedEnv(readEnv, "PLAID_SANDBOX_SECRET");
  if (sandboxSecret) {
    return {
      targetEnvironment: "sandbox",
      basePath: hostFromEnvironment("sandbox"),
      clientId,
      secret: sandboxSecret,
      secretSource: "PLAID_SANDBOX_SECRET",
      clientIdLast4: last4(clientId),
      secretLength: sandboxSecret.length,
    };
  }

  if (plaidEnv === "sandbox") {
    const secret = readTrimmedEnv(readEnv, "PLAID_SECRET");
    if (!secret) return null;
    return {
      targetEnvironment: "sandbox",
      basePath: hostFromEnvironment("sandbox"),
      clientId,
      secret,
      secretSource: "PLAID_SECRET",
      clientIdLast4: last4(clientId),
      secretLength: secret.length,
    };
  }

  return null;
}

export function resolvePlaidCredentials(
  target: PlaidEnvironment,
): ResolvedPlaidCredentials | null {
  return resolvePlaidCredentialsFromEnv(
    (name) => process.env[name],
    target,
  );
}

export function toPlaidRoutingDebug(
  target: PlaidEnvironment,
  creds: ResolvedPlaidCredentials | null,
): PlaidRoutingDebug {
  return {
    requestedEnvironment: target,
    resolvedPlaidHost: creds?.basePath ?? null,
    secretSource: creds?.secretSource ?? "missing",
    clientIdLast4: creds?.clientIdLast4 ?? null,
    secretLength: creds?.secretLength ?? 0,
  };
}

export function canResolvePlaidCredentials(
  target: PlaidEnvironment,
): boolean {
  return resolvePlaidCredentials(target) !== null;
}

/** Lightweight self-check for credential routing rules (no network). */
export function selfTestPlaidCredentialRouting(): {
  ok: boolean;
  failures: string[];
} {
  const failures: string[] = [];
  const mock = (vars: Record<string, string>) => (key: string) => vars[key];

  const production = resolvePlaidCredentialsFromEnv(
    mock({
      PLAID_ENV: "production",
      PLAID_CLIENT_ID: "client-id-prod",
      PLAID_SECRET: "production-secret-value",
      PLAID_SANDBOX_SECRET: "sandbox-secret-value",
    }),
    "production",
  );
  if (!production) failures.push("production: expected credentials");
  else {
    if (production.basePath !== "https://production.plaid.com") {
      failures.push(`production: host=${production.basePath}`);
    }
    if (production.secretSource !== "PLAID_SECRET") {
      failures.push(`production: secretSource=${production.secretSource}`);
    }
    if (production.secret !== "production-secret-value") {
      failures.push("production: used sandbox secret");
    }
  }

  const productionExplicit = resolvePlaidCredentialsFromEnv(
    mock({
      PLAID_ENV: "production",
      PLAID_CLIENT_ID: "client-id-prod",
      PLAID_SECRET: "fallback-secret",
      PLAID_PRODUCTION_SECRET: "explicit-production-secret",
      PLAID_SANDBOX_SECRET: "sandbox-secret-value",
    }),
    "production",
  );
  if (productionExplicit?.secretSource !== "PLAID_PRODUCTION_SECRET") {
    failures.push("production explicit secret source mismatch");
  }
  if (productionExplicit?.secret !== "explicit-production-secret") {
    failures.push("production explicit secret value mismatch");
  }

  const sandboxWithDedicated = resolvePlaidCredentialsFromEnv(
    mock({
      PLAID_ENV: "production",
      PLAID_CLIENT_ID: "client-id-prod",
      PLAID_SECRET: "production-secret-value",
      PLAID_SANDBOX_SECRET: "sandbox-secret-value",
    }),
    "sandbox",
  );
  if (!sandboxWithDedicated) failures.push("sandbox: expected dedicated secret");
  else {
    if (sandboxWithDedicated.basePath !== "https://sandbox.plaid.com") {
      failures.push(`sandbox: host=${sandboxWithDedicated.basePath}`);
    }
    if (sandboxWithDedicated.secretSource !== "PLAID_SANDBOX_SECRET") {
      failures.push(`sandbox: secretSource=${sandboxWithDedicated.secretSource}`);
    }
    if (sandboxWithDedicated.secret !== "sandbox-secret-value") {
      failures.push("sandbox: wrong secret selected");
    }
  }

  const sandboxFallbackBlocked = resolvePlaidCredentialsFromEnv(
    mock({
      PLAID_ENV: "production",
      PLAID_CLIENT_ID: "client-id-prod",
      PLAID_SECRET: "production-secret-value",
    }),
    "sandbox",
  );
  if (sandboxFallbackBlocked !== null) {
    failures.push("sandbox: must not fall back to PLAID_SECRET when PLAID_ENV=production");
  }

  const sandboxFromSecret = resolvePlaidCredentialsFromEnv(
    mock({
      PLAID_ENV: "sandbox",
      PLAID_CLIENT_ID: "client-id-sandbox",
      PLAID_SECRET: "sandbox-only-secret",
    }),
    "sandbox",
  );
  if (sandboxFromSecret?.secretSource !== "PLAID_SECRET") {
    failures.push("sandbox-only env should use PLAID_SECRET");
  }

  return { ok: failures.length === 0, failures };
}
