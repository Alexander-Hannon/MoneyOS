import type { CountryCode } from "plaid";
import {
  describePlaidError,
  getPlaidClient,
  getPlaidConfig,
} from "@/lib/plaid/client";
import { hashPlaidId } from "@/lib/plaid/plaid-hash";
import { isEncryptionConfigured } from "@/lib/security/encryption";
import {
  countActivePlaidItemsForUser,
  getPlaidItemForUser,
  listActivePlaidItemsForUser,
  listConnectedInstitutionsForUser,
  listPlaidItemsForUser,
  markPlaidItemDisconnected,
  toSafePlaidItem,
  upsertConnectedInstitution,
  upsertPlaidItemForUser,
} from "@/lib/db/plaid-items";
import { syncPlaidItemForUser, syncAllPlaidItemsForUser } from "@/lib/plaid/sync-service";

export type PlaidExchangeResult = {
  item_id: string;
  access_token: string;
};

export type SafePlaidConnectionSummary = {
  plaidItemId: string;
  institutionName: string;
  itemIdHash: string;
  accountCount: number;
  transactionCount: number;
  lastSyncAt: string | null;
};

export class PlaidPersistenceError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "encryption_not_configured"
      | "database_not_configured"
      | "not_found"
      | "plaid_error",
  ) {
    super(message);
    this.name = "PlaidPersistenceError";
  }
}

export async function getPlaidItemsForUser(userId: string) {
  const items = await listPlaidItemsForUser(userId);
  return items.map(toSafePlaidItem);
}

export async function getActivePlaidItemsForUser(userId: string) {
  const items = await listActivePlaidItemsForUser(userId);
  return items.map(toSafePlaidItem);
}

export async function storePlaidItemForUser(args: {
  userId: string;
  exchange: PlaidExchangeResult;
  institutionId?: string | null;
  institutionName?: string | null;
}): Promise<SafePlaidConnectionSummary> {
  if (!isEncryptionConfigured()) {
    throw new PlaidPersistenceError(
      "PLAID_TOKEN_ENCRYPTION_KEY is not configured. Generate with: openssl rand -base64 32",
      "encryption_not_configured",
    );
  }

  const config = getPlaidConfig();
  const item = await upsertPlaidItemForUser({
    userId: args.userId,
    itemId: args.exchange.item_id,
    accessToken: args.exchange.access_token,
    institutionId: args.institutionId ?? null,
    institutionName: args.institutionName ?? null,
    environment: config?.env ?? "sandbox",
  });

  const itemIdHash = hashPlaidId(args.exchange.item_id);
  await upsertConnectedInstitution({
    userId: args.userId,
    plaidItemId: item.id,
    itemIdHash,
    institutionName: args.institutionName ?? "Connected bank",
    source: "plaid_sandbox",
  });

  const syncSummary = await syncPlaidItemForUser(args.userId, item.id);

  return {
    plaidItemId: item.id,
    institutionName: args.institutionName ?? "Connected bank",
    itemIdHash,
    accountCount: syncSummary.accountCount,
    transactionCount: syncSummary.transactionCount,
    lastSyncAt: syncSummary.lastSyncAt,
  };
}

export async function disconnectPlaidItemForUser(
  userId: string,
  plaidItemId: string,
) {
  const item = await getPlaidItemForUser(userId, plaidItemId);
  if (!item) {
    throw new PlaidPersistenceError("Plaid item not found.", "not_found");
  }

  const client = getPlaidClient();
  const config = getPlaidConfig();
  if (client && config && item.accessTokenEncrypted) {
    try {
      const { decryptSecret } = await import("@/lib/security/encryption");
      const accessToken = decryptSecret(item.accessTokenEncrypted);
      await client.itemRemove({ access_token: accessToken });
    } catch {
      // Best-effort remove at Plaid — still mark disconnected locally.
    }
  }

  await markPlaidItemDisconnected(userId, plaidItemId);
}

export async function getConnectedInstitutionSummaries(userId: string) {
  const [institutions, accounts] = await Promise.all([
    listConnectedInstitutionsForUser(userId),
    import("@/lib/db/accounts").then((m) => m.listPlaidAccountsForUser(userId)),
  ]);

  return institutions.map((inst) => ({
    id: inst.id,
    plaidItemId: inst.plaidItemId,
    institutionName: inst.institutionName,
    accountCount: accounts.filter(
      (a) => a.plaidItemId === inst.plaidItemId,
    ).length,
    status: inst.status as "connected" | "disconnected" | "error" | "syncing",
    connectedAt: inst.connectedAt.toISOString(),
    lastSyncAt: inst.lastSyncAt?.toISOString() ?? null,
    source: inst.source as "plaid_sandbox" | "future_live",
  }));
}

export async function resolveInstitutionNameFromToken(
  accessToken: string,
): Promise<{ institutionId: string | null; institutionName: string }> {
  const client = getPlaidClient();
  const config = getPlaidConfig();
  if (!client || !config) {
    return { institutionId: null, institutionName: "Connected bank" };
  }

  try {
    const itemRes = await client.itemGet({ access_token: accessToken });
    const institutionId = itemRes.data.item.institution_id ?? null;
    if (!institutionId) {
      return { institutionId: null, institutionName: "Connected bank" };
    }

    const inst = await client.institutionsGetById({
      institution_id: institutionId,
      country_codes: config.countryCodes as CountryCode[],
    });
    return {
      institutionId,
      institutionName: inst.data.institution.name,
    };
  } catch (error) {
    void describePlaidError(error);
    return { institutionId: null, institutionName: "Connected bank" };
  }
}

export { syncPlaidItemForUser, syncAllPlaidItemsForUser, countActivePlaidItemsForUser };
