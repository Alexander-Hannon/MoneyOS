import type { PlaidEnvironment } from "@/lib/plaid/plaid-env";
import {
  listActivePlaidItemsForUser,
} from "@/lib/db/plaid-items";
import { listPlaidAccountsForUser } from "@/lib/db/accounts";
import {
  loadPersistedPlaidDataForUser,
  syncPlaidItemForUser,
} from "@/lib/plaid/sync-service";

export type PlaidAccountDiagnostics = {
  accountCountFromPlaid: number | null;
  accountCountSaved: number;
  accountCountForItem: Record<string, number>;
  accountTypesFound: string[];
  environment: PlaidEnvironment | null;
  refreshedEmptyAccounts: boolean;
};

/** If persisted accounts are missing, pull balances from Plaid and upsert. */
export async function ensurePlaidAccountsPersisted(
  userId: string,
  environment?: PlaidEnvironment,
): Promise<{
  refreshedEmptyAccounts: boolean;
  accountCountFromPlaid: number | null;
}> {
  const existing = await listPlaidAccountsForUser(userId, environment);
  if (existing.length > 0) {
    return { refreshedEmptyAccounts: false, accountCountFromPlaid: null };
  }

  const items = await listActivePlaidItemsForUser(userId, environment);
  if (items.length === 0) {
    return { refreshedEmptyAccounts: false, accountCountFromPlaid: null };
  }

  let accountCountFromPlaid = 0;
  for (const item of items) {
    const summary = await syncPlaidItemForUser(userId, item.id, {
      refreshBalances: true,
    });
    accountCountFromPlaid += summary.accountCount;
  }

  return { refreshedEmptyAccounts: true, accountCountFromPlaid };
}

export async function loadPlaidAccountsWithDiagnostics(
  userId: string,
  environment?: PlaidEnvironment,
  options?: { refreshIfEmpty?: boolean },
): Promise<{
  data: Awaited<ReturnType<typeof loadPersistedPlaidDataForUser>>;
  diagnostics: PlaidAccountDiagnostics;
}> {
  const refreshIfEmpty = options?.refreshIfEmpty !== false;
  let refreshedEmptyAccounts = false;
  let accountCountFromPlaid: number | null = null;

  if (refreshIfEmpty) {
    const heal = await ensurePlaidAccountsPersisted(userId, environment);
    refreshedEmptyAccounts = heal.refreshedEmptyAccounts;
    accountCountFromPlaid = heal.accountCountFromPlaid;
  }

  const data = await loadPersistedPlaidDataForUser(userId, environment);
  const dbAccounts = await listPlaidAccountsForUser(userId, environment);

  const accountCountForItem: Record<string, number> = {};
  for (const account of dbAccounts) {
    if (!account.plaidItemId) continue;
    accountCountForItem[account.plaidItemId] =
      (accountCountForItem[account.plaidItemId] ?? 0) + 1;
  }

  return {
    data,
    diagnostics: {
      accountCountFromPlaid,
      accountCountSaved: dbAccounts.length,
      accountCountForItem,
      accountTypesFound: [...new Set(dbAccounts.map((a) => a.type))],
      environment: data.environment,
      refreshedEmptyAccounts,
    },
  };
}
