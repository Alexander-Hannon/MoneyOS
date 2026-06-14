import { getPrisma } from "@/lib/db/prisma";

export async function listAccountsForUser(userId: string) {
  const prisma = getPrisma();
  if (!prisma) return [];
  return prisma.account.findMany({
    where: { userId },
    orderBy: { name: "asc" },
  });
}

/** Phase 9: accounts from Plaid are not persisted yet — scaffold only. */
export async function replaceAccountsForUser(
  userId: string,
  accounts: Record<string, unknown>[],
) {
  const prisma = getPrisma();
  if (!prisma) throw new Error("Database is not configured.");

  await prisma.$transaction(async (tx) => {
    await tx.account.deleteMany({ where: { userId } });
    for (const account of accounts) {
      await tx.account.create({
        data: {
          id: account.id ? String(account.id) : undefined,
          userId,
          plaidAccountIdHash: account.plaidAccountIdHash
            ? String(account.plaidAccountIdHash)
            : null,
          name: String(account.name ?? "Account"),
          institution: String(account.institution ?? "Unknown"),
          type: String(account.type ?? "other"),
          subtype: account.subtype ? String(account.subtype) : null,
          mask: account.mask ? String(account.mask) : null,
          currentBalance:
            account.currentBalance == null
              ? null
              : Number(account.currentBalance),
          availableBalance:
            account.availableBalance == null
              ? null
              : Number(account.availableBalance),
          source: String(account.source ?? "manual"),
          connectionStatus: String(account.connectionStatus ?? "not_connected"),
        },
      });
    }
  });
}
