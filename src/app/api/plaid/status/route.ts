import { NextResponse } from "next/server";
import { getPlaidSession } from "@/lib/plaid/token-store";
import { resolvePlaidStorageContext } from "@/lib/plaid/storage-mode";
import {
  listActivePlaidItemsForUser,
} from "@/lib/db/plaid-items";
import { ensurePlaidAccountsPersisted } from "@/lib/plaid/account-persistence";
import { getConnectedInstitutionSummaries } from "@/lib/plaid/persistent-items";
import { listPlaidAccountsForUser } from "@/lib/db/accounts";
import { validateMoneyOSEnv } from "@/lib/env/validation";
import { checkStoredEncryptionHealth } from "@/lib/env/encryption-health";
import { getOptionalAuthUser } from "@/lib/auth/session";
import {
  canUserAccessLivePlaidUI,
  getLivePlaidDiagnostics,
} from "@/lib/plaid/live-mode";
import { plaidSourceForEnvironment } from "@/lib/plaid/plaid-env";
import { canResolvePlaidCredentials } from "@/lib/plaid/client";

// GET /api/plaid/status
export async function GET() {
  const env = validateMoneyOSEnv();
  const storage = await resolvePlaidStorageContext();
  const authUser = await getOptionalAuthUser();
  const liveDiagnostics = getLivePlaidDiagnostics();
  const liveUserAllowed = canUserAccessLivePlaidUI(authUser);
  const encryptionHealth = await checkStoredEncryptionHealth(
    authUser?.userId ?? null,
  );

  const diagnostics = {
    issues: env.issues,
    warnings: [...env.warnings],
    plaidConfigValid: env.plaidConfigValid,
    aiProvider: env.aiProvider,
    geminiConfigured: env.geminiConfigured,
    encryptionRoundTripOk: env.encryptionRoundTripOk,
    storedEncryptionHealth: encryptionHealth,
    livePlaid: liveDiagnostics,
    liveUserAllowed,
  };

  if (
    encryptionHealth.hasStoredTokens &&
    encryptionHealth.decryptOk === false
  ) {
    diagnostics.warnings.push("encryption_key_mismatch_likely");
    diagnostics.issues.push("plaid_token_encryption_key_decrypt_failed");
  }

  if (
    env.databaseConfigured &&
    env.encryptionConfigured &&
    encryptionHealth.decryptOk === null
  ) {
    diagnostics.warnings.push(
      "shared_database_encryption_key_must_match_across_devices",
    );
  }

  if (storage.mode === "database" && storage.userId) {
    const [sandboxItems, liveItems] = await Promise.all([
      listActivePlaidItemsForUser(storage.userId, "sandbox"),
      listActivePlaidItemsForUser(storage.userId, "production"),
    ]);

    const sandboxConnected = env.plaidConfigValid && sandboxItems.length > 0;
    const liveConnected = liveItems.length > 0;
    const connected = sandboxConnected || liveConnected;

    const activeEnvironment = liveConnected
      ? ("production" as const)
      : sandboxConnected
        ? ("sandbox" as const)
        : null;

    if (connected) {
      if (liveConnected) {
        await ensurePlaidAccountsPersisted(storage.userId, "production");
      }
      if (sandboxConnected) {
        await ensurePlaidAccountsPersisted(storage.userId, "sandbox");
      }
    }

    const [sandboxInstitutions, liveInstitutions] = connected
      ? await Promise.all([
          sandboxConnected
            ? getConnectedInstitutionSummaries(storage.userId, "sandbox")
            : [],
          liveConnected
            ? getConnectedInstitutionSummaries(storage.userId, "production")
            : [],
        ])
      : [[], []];

    const institutions = [...sandboxInstitutions, ...liveInstitutions];

    const accounts = connected
      ? await listPlaidAccountsForUser(storage.userId, activeEnvironment ?? undefined)
      : [];

    const activeItems = activeEnvironment === "production" ? liveItems : sandboxItems;
    const lastSyncAt =
      activeItems
        .map((i) => i.lastSyncAt)
        .filter(Boolean)
        .sort(
          (a, b) =>
            new Date(String(b)).getTime() - new Date(String(a)).getTime(),
        )[0]
        ?.toISOString() ?? null;

    const lastBalanceRefreshAt =
      liveItems
        .map((i) => i.lastBalanceRefreshAt)
        .filter(Boolean)
        .sort(
          (a, b) =>
            new Date(String(b)).getTime() - new Date(String(a)).getTime(),
        )[0]
        ?.toISOString() ?? null;

    const source = activeEnvironment
      ? plaidSourceForEnvironment(activeEnvironment)
      : "manual";

    return NextResponse.json({
      configured: env.plaidConfigured,
      plaidConfigured: env.plaidConfigured,
      plaidConfigValid: env.plaidConfigValid,
      plaidEnv: env.plaidEnv,
      plaidProducts: env.plaidProducts,
      plaidCountryCodes: env.plaidCountryCodes,
      connected,
      sandboxConnected,
      liveConnected,
      activeEnvironment,
      status: connected ? "connected" : "not_connected",
      source,
      storageMode: "database",
      dataSource: connected ? source : "manual",
      authConfigured: storage.authConfigured,
      databaseConfigured: storage.databaseConfigured,
      encryptionConfigured: storage.encryptionConfigured,
      persistentPlaidEnabled: storage.persistentPlaidEnabled,
      livePlaidEnabled: env.livePlaidEnabled,
      liveUserAllowed,
      sandboxConnectAvailable: canResolvePlaidCredentials("sandbox"),
      institutionCount: institutions.length,
      accountCount: accounts.length,
      institutions,
      sandboxInstitutions,
      liveInstitutions,
      lastSyncAt,
      lastBalanceRefreshAt,
      diagnostics,
    });
  }

  const session = getPlaidSession();
  const connected = env.plaidConfigValid && session !== null;

  return NextResponse.json({
    configured: env.plaidConfigured,
    plaidConfigured: env.plaidConfigured,
    plaidConfigValid: env.plaidConfigValid,
    plaidEnv: env.plaidEnv,
    plaidProducts: env.plaidProducts,
    plaidCountryCodes: env.plaidCountryCodes,
    connected,
    sandboxConnected: connected,
    liveConnected: false,
    activeEnvironment: connected ? "sandbox" : null,
    status: connected ? "connected" : "not_connected",
    source: connected ? "plaid_sandbox" : "mock",
    storageMode: connected ? "memory" : "none",
    dataSource: connected ? "plaid_sandbox" : "manual",
    authConfigured: storage.authConfigured,
    databaseConfigured: storage.databaseConfigured,
    encryptionConfigured: storage.encryptionConfigured,
    persistentPlaidEnabled: storage.persistentPlaidEnabled,
    livePlaidEnabled: env.livePlaidEnabled,
    liveUserAllowed,
    sandboxConnectAvailable: canResolvePlaidCredentials("sandbox"),
    institutionCount: connected ? 1 : 0,
    accountCount: 0,
    institutions: [],
    sandboxInstitutions: [],
    liveInstitutions: [],
    lastSyncAt: session?.lastSyncAt ?? null,
    lastBalanceRefreshAt: null,
    devOnlyWarning: connected
      ? "Sandbox token stored in server memory only — lost on restart. Sign in with database + encryption key to persist."
      : undefined,
    diagnostics,
  });
}
