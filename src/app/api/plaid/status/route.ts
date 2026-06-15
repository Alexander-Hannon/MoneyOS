import { NextResponse } from "next/server";
import { isPlaidConfigured } from "@/lib/plaid/client";
import { getPlaidSession } from "@/lib/plaid/token-store";
import { resolvePlaidStorageContext } from "@/lib/plaid/storage-mode";
import {
  listActivePlaidItemsForUser,
} from "@/lib/db/plaid-items";
import { getConnectedInstitutionSummaries } from "@/lib/plaid/persistent-items";
import { listPlaidAccountsForUser } from "@/lib/db/accounts";

// GET /api/plaid/status
export async function GET() {
  const configured = isPlaidConfigured();
  const storage = await resolvePlaidStorageContext();

  if (storage.mode === "database" && storage.userId) {
    const activeItems = await listActivePlaidItemsForUser(storage.userId);
    const connected = configured && activeItems.length > 0;
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
      configured,
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
    });
  }

  const session = getPlaidSession();
  const connected = configured && session !== null;

  return NextResponse.json({
    configured,
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
  });
}
