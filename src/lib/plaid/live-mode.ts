import { isClerkConfigured, isDatabaseConfigured } from "@/lib/auth/config";
import type { AuthenticatedDbUser } from "@/lib/auth/session";
import { validateEncryptionKey, validateMoneyOSEnv } from "@/lib/env/validation";
import { isEncryptionConfigured } from "@/lib/security/encryption";
import type { PlaidLinkTarget } from "@/lib/plaid/plaid-env";

/** Safe diagnostic codes returned to clients — never include secrets. */
export type LivePlaidErrorCode =
  | "live_plaid_disabled"
  | "live_user_not_allowed"
  | "production_env_not_configured"
  | "encryption_required"
  | "auth_required"
  | "database_required";

export type LivePlaidAccessResult =
  | { ok: true }
  | { ok: false; errorCode: LivePlaidErrorCode; message: string };

function trimEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value || undefined;
}

export function isLivePlaidFeatureEnabled(): boolean {
  const raw = trimEnv("MONEYOS_ENABLE_LIVE_PLAID")?.toLowerCase();
  return raw === "true" || raw === "1" || raw === "yes";
}

export function getAllowedLiveUserEmail(): string | null {
  const email = trimEnv("MONEYOS_ALLOWED_LIVE_USER_EMAIL");
  return email ? email.toLowerCase() : null;
}

export function isAllowedLiveUserEmail(email: string | null | undefined): boolean {
  const allowed = getAllowedLiveUserEmail();
  if (!allowed) return false;
  if (!email) return false;
  return email.trim().toLowerCase() === allowed;
}

export function isProductionPlaidEnvConfigured(): boolean {
  const env = validateMoneyOSEnv();
  return env.plaidConfigured && env.plaidEnv === "production";
}

/** Whether the signed-in user may see live Plaid UI affordances. */
export function canUserAccessLivePlaidUI(
  user: AuthenticatedDbUser | null,
): boolean {
  if (!isLivePlaidFeatureEnabled()) return false;
  if (!user) return false;
  return isAllowedLiveUserEmail(user.email);
}

/**
 * Gate production Plaid Link creation and token exchange.
 * Sandbox links bypass this check.
 */
export function validateLivePlaidAccess(args: {
  user: AuthenticatedDbUser | null;
  targetEnvironment: PlaidLinkTarget;
}): LivePlaidAccessResult {
  if (args.targetEnvironment === "sandbox") {
    return { ok: true };
  }

  if (!isLivePlaidFeatureEnabled()) {
    return {
      ok: false,
      errorCode: "live_plaid_disabled",
      message:
        "Personal live Plaid is disabled. Set MONEYOS_ENABLE_LIVE_PLAID=true to enable.",
    };
  }

  if (!isProductionPlaidEnvConfigured()) {
    return {
      ok: false,
      errorCode: "production_env_not_configured",
      message:
        "Production Plaid is not configured. Set PLAID_ENV=production with valid production credentials.",
    };
  }

  if (!isClerkConfigured()) {
    return {
      ok: false,
      errorCode: "auth_required",
      message: "Sign in with Clerk is required for personal live Plaid connections.",
    };
  }

  if (!args.user) {
    return {
      ok: false,
      errorCode: "auth_required",
      message: "You must be signed in to connect real financial accounts.",
    };
  }

  if (!isDatabaseConfigured()) {
    return {
      ok: false,
      errorCode: "database_required",
      message:
        "A database is required to persist encrypted live Plaid tokens.",
    };
  }

  if (!isEncryptionConfigured() || !validateEncryptionKey().valid) {
    return {
      ok: false,
      errorCode: "encryption_required",
      message:
        "PLAID_TOKEN_ENCRYPTION_KEY must be configured before connecting live accounts.",
    };
  }

  if (!isAllowedLiveUserEmail(args.user.email)) {
    return {
      ok: false,
      errorCode: "live_user_not_allowed",
      message:
        "This account is not authorized for personal live Plaid. Check MONEYOS_ALLOWED_LIVE_USER_EMAIL.",
    };
  }

  return { ok: true };
}

export type LivePlaidDiagnostics = {
  livePlaidEnabled: boolean;
  allowedLiveUserConfigured: boolean;
  productionEnvConfigured: boolean;
  encryptionConfigured: boolean;
  authConfigured: boolean;
  databaseConfigured: boolean;
  currentPlaidEnv: string | null;
  allowedLiveUserEmailConfigured: boolean;
};

export function getLivePlaidDiagnostics(): LivePlaidDiagnostics {
  const env = validateMoneyOSEnv();
  return {
    livePlaidEnabled: isLivePlaidFeatureEnabled(),
    allowedLiveUserConfigured: Boolean(getAllowedLiveUserEmail()),
    productionEnvConfigured: isProductionPlaidEnvConfigured(),
    encryptionConfigured: env.encryptionConfigured,
    authConfigured: env.authConfigured,
    databaseConfigured: env.databaseConfigured,
    currentPlaidEnv: env.plaidEnv,
    allowedLiveUserEmailConfigured: Boolean(getAllowedLiveUserEmail()),
  };
}
