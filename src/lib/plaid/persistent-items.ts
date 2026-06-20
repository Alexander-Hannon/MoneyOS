import type { CountryCode } from "plaid";
import {
  describePlaidError,
  getPlaidClientForEnvironment,
  getPlaidConfig,
} from "@/lib/plaid/client";
import { hashPlaidId } from "@/lib/plaid/plaid-hash";
import { isEncryptionConfigured } from "@/lib/security/encryption";
import type { PlaidEnvironment } from "@/lib/plaid/plaid-env";
import { isPlaidEnvironment, plaidSourceForEnvironment } from "@/lib/plaid/plaid-env";
import {
  countActivePlaidItemsForUser,
  deletePlaidItemHistory,
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
import {
  reconcileInstitutionReconnect,
  type PlaidConnectionKind,
} from "@/lib/plaid/plaid-reconnect";

export type PlaidExchangeResult = {
  item_id: string;
  access_token: string;
};

export type SafePlaidConnectionSummary = {
  plaidItemId: string;
  institutionName: string;
  itemIdHash: string;
  environment: PlaidEnvironment;
  source: "plaid_sandbox" | "plaid_live";
  connectionKind: PlaidConnectionKind;
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
      | "plaid_error"
      | "live_not_allowed",
  ) {
    super(message);
    this.name = "PlaidPersistenceError";
  }
}

export async function getPlaidItemsForUser(userId: string) {
  const items = await listPlaidItemsForUser(userId);
  return items.map(toSafePlaidItem);
}

export async function getActivePlaidItemsForUser(
  userId: string,
  environment?: PlaidEnvironment,
) {
  const items = await listActivePlaidItemsForUser(userId, environment);
  return items.map(toSafePlaidItem);
}

export async function storePlaidItemForUser(args: {
  userId: string;
  exchange: PlaidExchangeResult;
  institutionId?: string | null;
  institutionName?: string | null;
  environment: PlaidEnvironment;
}): Promise<SafePlaidConnectionSummary> {
  if (args.environment === "production" && !isEncryptionConfigured()) {
    throw new PlaidPersistenceError(
      "Live Plaid requires encrypted token storage.",
      "encryption_not_configured",
    );
  }

  if (!isEncryptionConfigured()) {
    throw new PlaidPersistenceError(
      "PLAID_TOKEN_ENCRYPTION_KEY is not configured. Generate with: openssl rand -base64 32",
      "encryption_not_configured",
    );
  }

  const source = plaidSourceForEnvironment(args.environment) as
    | "plaid_sandbox"
    | "plaid_live";

  const reconcile = await reconcileInstitutionReconnect({
    userId: args.userId,
    institutionId: args.institutionId,
    environment: args.environment,
    newItemId: args.exchange.item_id,
  });

  const item = await upsertPlaidItemForUser({
    userId: args.userId,
    itemId: args.exchange.item_id,
    accessToken: args.exchange.access_token,
    institutionId: args.institutionId ?? null,
    institutionName: args.institutionName ?? null,
    environment: args.environment,
  });

  const itemIdHash = hashPlaidId(args.exchange.item_id);
  await upsertConnectedInstitution({
    userId: args.userId,
    plaidItemId: item.id,
    itemIdHash,
    institutionName: args.institutionName ?? "Connected bank",
    source,
    institutionId: args.institutionId ?? null,
  });

  const syncSummary = await syncPlaidItemForUser(args.userId, item.id, {
    refreshBalances: true,
  });

  return {
    plaidItemId: item.id,
    institutionName: args.institutionName ?? "Connected bank",
    itemIdHash,
    environment: args.environment,
    source,
    connectionKind: reconcile.connectionKind,
    accountCount: syncSummary.accountCount,
    transactionCount: syncSummary.transactionCount,
    lastSyncAt: syncSummary.lastSyncAt,
  };
}

export async function disconnectPlaidItemForUser(
  userId: string,
  plaidItemId: string,
  options?: { deleteHistory?: boolean },
) {
  const item = await getPlaidItemForUser(userId, plaidItemId);
  if (!item) {
    throw new PlaidPersistenceError("Plaid item not found.", "not_found");
  }

  const environment = isPlaidEnvironment(item.environment)
    ? item.environment
    : "sandbox";
  const client = getPlaidClientForEnvironment(environment);

  if (client && item.accessTokenEncrypted) {
    try {
      const { decryptSecret } = await import("@/lib/security/encryption");
      const accessToken = decryptSecret(item.accessTokenEncrypted);
      await client.itemRemove({ access_token: accessToken });
    } catch {
      // Best-effort remove at Plaid — still mark disconnected locally.
    }
  }

  await markPlaidItemDisconnected(userId, plaidItemId);

  if (options?.deleteHistory) {
    await deletePlaidItemHistory(userId, plaidItemId);
  }
}

export async function getConnectedInstitutionSummaries(
  userId: string,
  environment?: PlaidEnvironment,
) {
  const [institutions, accounts] = await Promise.all([
    listConnectedInstitutionsForUser(userId, environment),
    import("@/lib/db/accounts").then((m) =>
      m.listPlaidAccountsForUser(userId, environment),
    ),
  ]);

  return institutions.map((inst) => ({
    id: inst.id,
    plaidItemId: inst.plaidItemId,
    institutionName: inst.institutionName,
    accountCount: accounts.filter((a) => {
      if (inst.plaidItemId && a.plaidItemId) {
        return a.plaidItemId === inst.plaidItemId;
      }
      return (
        a.source === inst.source &&
        a.institution.toLowerCase() === inst.institutionName.toLowerCase()
      );
    }).length,
    status: inst.status as "connected" | "disconnected" | "error" | "syncing",
    connectedAt: inst.connectedAt.toISOString(),
    lastSyncAt: inst.lastSyncAt?.toISOString() ?? null,
    source: inst.source as "plaid_sandbox" | "plaid_live",
    environment:
      inst.source === "plaid_live"
        ? ("production" as const)
        : ("sandbox" as const),
  }));
}

export async function resolveInstitutionNameFromToken(
  accessToken: string,
  environment: PlaidEnvironment = "sandbox",
): Promise<{ institutionId: string | null; institutionName: string }> {
  const client = getPlaidClientForEnvironment(environment);
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

export {
  syncPlaidItemForUser,
  syncAllPlaidItemsForUser,
  countActivePlaidItemsForUser,
};
