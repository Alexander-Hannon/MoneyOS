import { getPrisma } from "@/lib/db/prisma";
import { decryptSecret, encryptSecret } from "@/lib/security/encryption";
import { hashPlaidId } from "@/lib/plaid/plaid-hash";
import type { PlaidEnvironment } from "@/lib/plaid/plaid-env";
import { plaidSourceForEnvironment } from "@/lib/plaid/plaid-env";

export type SafePlaidItem = {
  id: string;
  institutionId: string | null;
  institutionName: string | null;
  environment: string;
  status: string;
  lastSyncAt: string | null;
  lastBalanceRefreshAt: string | null;
  connectedAt: string;
};

export async function listPlaidItemsForUser(userId: string) {
  const prisma = getPrisma();
  if (!prisma) return [];
  return prisma.plaidItem.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });
}

export async function listActivePlaidItemsForUser(
  userId: string,
  environment?: PlaidEnvironment,
) {
  const prisma = getPrisma();
  if (!prisma) return [];
  return prisma.plaidItem.findMany({
    where: {
      userId,
      status: "connected",
      disconnectedAt: null,
      ...(environment ? { environment } : {}),
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function getPlaidItemForUser(userId: string, plaidItemId: string) {
  const prisma = getPrisma();
  if (!prisma) return null;
  return prisma.plaidItem.findFirst({
    where: { id: plaidItemId, userId },
  });
}

export async function getPlaidItemAccessToken(
  userId: string,
  plaidItemId: string,
): Promise<string | null> {
  const item = await getPlaidItemForUser(userId, plaidItemId);
  if (!item?.accessTokenEncrypted || item.status !== "connected") return null;
  return decryptSecret(item.accessTokenEncrypted);
}

export async function upsertPlaidItemForUser(args: {
  userId: string;
  itemId: string;
  accessToken: string;
  institutionId?: string | null;
  institutionName?: string | null;
  environment?: string;
}) {
  const prisma = getPrisma();
  if (!prisma) throw new Error("Database is not configured.");

  const itemIdHash = hashPlaidId(args.itemId);
  const accessTokenEncrypted = encryptSecret(args.accessToken);

  return prisma.plaidItem.upsert({
    where: {
      userId_itemIdHash: {
        userId: args.userId,
        itemIdHash,
      },
    },
    create: {
      userId: args.userId,
      itemIdHash,
      accessTokenEncrypted,
      institutionId: args.institutionId ?? null,
      institutionName: args.institutionName ?? null,
      environment: args.environment ?? "sandbox",
      status: "connected",
      disconnectedAt: null,
    },
    update: {
      accessTokenEncrypted,
      institutionId: args.institutionId ?? null,
      institutionName: args.institutionName ?? null,
      environment: args.environment ?? "sandbox",
      status: "connected",
      disconnectedAt: null,
    },
  });
}

export async function updatePlaidItemSyncState(args: {
  userId: string;
  plaidItemId: string;
  syncCursor: string | null;
  lastSyncAt: Date;
}) {
  const prisma = getPrisma();
  if (!prisma) throw new Error("Database is not configured.");

  return prisma.plaidItem.updateMany({
    where: { id: args.plaidItemId, userId: args.userId },
    data: {
      syncCursor: args.syncCursor,
      lastSyncAt: args.lastSyncAt,
      status: "connected",
    },
  });
}

export async function updatePlaidItemBalanceRefresh(args: {
  userId: string;
  plaidItemId: string;
  lastBalanceRefreshAt: Date;
}) {
  const prisma = getPrisma();
  if (!prisma) throw new Error("Database is not configured.");

  return prisma.plaidItem.updateMany({
    where: { id: args.plaidItemId, userId: args.userId },
    data: { lastBalanceRefreshAt: args.lastBalanceRefreshAt },
  });
}

export async function markPlaidItemDisconnected(
  userId: string,
  plaidItemId: string,
) {
  const prisma = getPrisma();
  if (!prisma) throw new Error("Database is not configured.");
  const now = new Date();

  await prisma.plaidItem.updateMany({
    where: { id: plaidItemId, userId },
    data: {
      status: "disconnected",
      disconnectedAt: now,
      accessTokenEncrypted: null,
      syncCursor: null,
    },
  });

  await prisma.connectedInstitution.updateMany({
    where: { userId, plaidItemId },
    data: {
      status: "disconnected",
      disconnectedAt: now,
    },
  });
}

export async function upsertConnectedInstitution(args: {
  userId: string;
  plaidItemId: string;
  itemIdHash: string;
  institutionName: string;
  source?: string;
}) {
  const prisma = getPrisma();
  if (!prisma) throw new Error("Database is not configured.");

  const existing = await prisma.connectedInstitution.findFirst({
    where: { userId: args.userId, plaidItemIdHash: args.itemIdHash },
  });

  if (existing) {
    return prisma.connectedInstitution.update({
      where: { id: existing.id },
      data: {
        institutionName: args.institutionName,
        plaidItemId: args.plaidItemId,
        status: "connected",
        source: args.source ?? "plaid_sandbox",
        connectedAt: new Date(),
        disconnectedAt: null,
      },
    });
  }

  return prisma.connectedInstitution.create({
    data: {
      userId: args.userId,
      institutionName: args.institutionName,
      plaidItemIdHash: args.itemIdHash,
      plaidItemId: args.plaidItemId,
      status: "connected",
      source: args.source ?? "plaid_sandbox",
      connectedAt: new Date(),
    },
  });
}

export async function deletePlaidItemHistory(userId: string, plaidItemId: string) {
  const prisma = getPrisma();
  if (!prisma) throw new Error("Database is not configured.");

  await prisma.$transaction(async (tx) => {
    await tx.moneyTransaction.deleteMany({
      where: { userId, plaidItemId },
    });
    await tx.account.deleteMany({
      where: { userId, plaidItemId },
    });
  });
}

export async function listConnectedInstitutionsForUser(
  userId: string,
  environment?: PlaidEnvironment,
) {
  const prisma = getPrisma();
  if (!prisma) return [];

  if (!environment) {
    return prisma.connectedInstitution.findMany({
      where: { userId, status: "connected", disconnectedAt: null },
      orderBy: { connectedAt: "asc" },
    });
  }

  const source = plaidSourceForEnvironment(environment);
  return prisma.connectedInstitution.findMany({
    where: {
      userId,
      status: "connected",
      disconnectedAt: null,
      source,
    },
    orderBy: { connectedAt: "asc" },
  });
}

export async function updateConnectedInstitutionSync(
  userId: string,
  plaidItemId: string,
  lastSyncAt: Date,
) {
  const prisma = getPrisma();
  if (!prisma) return;
  await prisma.connectedInstitution.updateMany({
    where: { userId, plaidItemId, status: "connected" },
    data: { lastSyncAt },
  });
}

export function toSafePlaidItem(item: {
  id: string;
  institutionId: string | null;
  institutionName: string | null;
  environment: string;
  status: string;
  lastSyncAt: Date | null;
  lastBalanceRefreshAt?: Date | null;
  createdAt: Date;
}): SafePlaidItem {
  return {
    id: item.id,
    institutionId: item.institutionId,
    institutionName: item.institutionName,
    environment: item.environment,
    status: item.status,
    lastSyncAt: item.lastSyncAt?.toISOString() ?? null,
    lastBalanceRefreshAt: item.lastBalanceRefreshAt?.toISOString() ?? null,
    connectedAt: item.createdAt.toISOString(),
  };
}

export async function countActivePlaidItemsForUser(
  userId: string,
  environment?: PlaidEnvironment,
): Promise<number> {
  const prisma = getPrisma();
  if (!prisma) return 0;
  return prisma.plaidItem.count({
    where: {
      userId,
      status: "connected",
      disconnectedAt: null,
      ...(environment ? { environment } : {}),
    },
  });
}
