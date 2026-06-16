import { NextResponse } from "next/server";
import { getPlaidSession } from "@/lib/plaid/token-store";
import { resolvePlaidStorageContext } from "@/lib/plaid/storage-mode";
import { listActivePlaidItemsForUser } from "@/lib/db/plaid-items";
import { getConnectedInstitutionSummaries } from "@/lib/plaid/persistent-items";
import { listPlaidAccountsForUser } from "@/lib/db/accounts";
import { validateMoneyOSEnv } from "@/lib/env/validation";
import { checkStoredEncryptionHealth } from "@/lib/env/encryption-health";
import { getOptionalAuthUser } from "@/lib/auth/session";

// GET /api/plaid/status
export async function GET() {
  const env = validateMoneyOSEnv();
  const storage = await resolvePlaidStorageContext();
  const authUser = await getOptionalAuthUser();
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
    const activeItems = await listActivePlaidItemsForUser(storage.userId);
    const connected = env.plaidConfigValid && activeItems.length > 0;
    const institutions = connected
      ? await getConnectedInstitutionSummaries(storage.userId)
      : [];
    const accounts = connected
      ? await listPlaidAccountsForUser(storage.userId)
      : [];
    const lastSyncAt =
      activeItems
        .map((i) => i.lastSyncAt)
        .filter(Boolean)
        .sort(
          (a, b) =>
            new Date(String(b)).getTime() - new Date(String(a)).getTime(),
        )[0]
        ?.toISOString() ?? null;

    return NextResponse.json({
      configured: env.plaidConfigured,
      plaidConfigured: env.plaidConfigured,
      plaidConfigValid: env.plaidConfigValid,
      plaidEnv: env.plaidEnv,
      plaidProducts: env.plaidProducts,
      plaidCountryCodes: env.plaidCountryCodes,
      connected,
      status: connected ? "connected" : "not_connected",
      source: connected ? "plaid_sandbox" : "mock",
      storageMode: "database",
      dataSource: connected ? "plaid_sandbox" : "manual",
      authConfigured: storage.authConfigured,
      databaseConfigured: storage.databaseConfigured,
      encryptionConfigured: storage.encryptionConfigured,
      persistentPlaidEnabled: storage.persistentPlaidEnabled,
      institutionCount: institutions.length,
      accountCount: accounts.length,
      institutions,
      lastSyncAt,
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
    status: connected ? "connected" : "not_connected",
    source: connected ? "plaid_sandbox" : "mock",
    storageMode: connected ? "memory" : "none",
    dataSource: connected ? "plaid_sandbox" : "manual",
    authConfigured: storage.authConfigured,
    databaseConfigured: storage.databaseConfigured,
    encryptionConfigured: storage.encryptionConfigured,
    persistentPlaidEnabled: storage.persistentPlaidEnabled,
    institutionCount: connected ? 1 : 0,
    accountCount: 0,
    institutions: [],
    lastSyncAt: session?.lastSyncAt ?? null,
    devOnlyWarning: connected
      ? "Sandbox token stored in server memory only — lost on restart. Sign in with database + encryption key to persist."
      : undefined,
    diagnostics,
  });
}
