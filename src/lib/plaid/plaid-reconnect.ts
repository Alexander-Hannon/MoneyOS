import { hashPlaidId } from "@/lib/plaid/plaid-hash";
import type { PlaidEnvironment } from "@/lib/plaid/plaid-env";
import {
  getPlaidItemForUser,
  listActivePlaidItemsForUser,
  markPlaidItemDisconnected,
} from "@/lib/db/plaid-items";

export type PlaidConnectionKind = "new" | "refreshed";

export async function findActivePlaidItemByInstitution(
  userId: string,
  institutionId: string,
  environment: PlaidEnvironment,
) {
  const items = await listActivePlaidItemsForUser(userId, environment);
  return (
    items.find(
      (item) =>
        item.institutionId === institutionId && item.status === "connected",
    ) ?? null
  );
}

/** Disconnect stale items for the same institution before storing a new link session. */
export async function reconcileInstitutionReconnect(args: {
  userId: string;
  institutionId: string | null | undefined;
  environment: PlaidEnvironment;
  newItemId: string;
}): Promise<{ connectionKind: PlaidConnectionKind; replacedPlaidItemId?: string }> {
  if (!args.institutionId) {
    return { connectionKind: "new" };
  }

  const existing = await findActivePlaidItemByInstitution(
    args.userId,
    args.institutionId,
    args.environment,
  );
  if (!existing) {
    return { connectionKind: "new" };
  }

  const newHash = hashPlaidId(args.newItemId);
  if (existing.itemIdHash === newHash) {
    return { connectionKind: "refreshed", replacedPlaidItemId: existing.id };
  }

  await markPlaidItemDisconnected(args.userId, existing.id);
  return { connectionKind: "refreshed", replacedPlaidItemId: existing.id };
}

export async function findDuplicatePlaidItems(userId: string) {
  const items = await listActivePlaidItemsForUser(userId, "production");
  const byInstitution = new Map<string, typeof items>();
  for (const item of items) {
    const key = item.institutionId ?? item.institutionName ?? item.id;
    const list = byInstitution.get(key) ?? [];
    list.push(item);
    byInstitution.set(key, list);
  }

  const duplicateGroups = [...byInstitution.entries()]
    .filter(([, group]) => group.length > 1)
    .map(([key, group]) => ({
      institutionKey: key,
      institutionName: group[0]?.institutionName ?? "Connected bank",
      items: group.map((item) => ({
        plaidItemId: item.id,
        itemIdHash: item.itemIdHash,
        lastSyncAt: item.lastSyncAt?.toISOString() ?? null,
        createdAt: item.createdAt.toISOString(),
      })),
    }));

  return duplicateGroups;
}

export async function pickCanonicalPlaidItemId(
  userId: string,
  plaidItemId: string,
): Promise<string | null> {
  const item = await getPlaidItemForUser(userId, plaidItemId);
  return item?.id ?? null;
}
