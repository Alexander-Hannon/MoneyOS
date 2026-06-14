import type { ConsentRecord } from "@/types/user";
import { getPrisma } from "@/lib/db/prisma";

export async function listConsentForUser(userId: string) {
  const prisma = getPrisma();
  if (!prisma) return [];
  const rows = await prisma.consentRecord.findMany({
    where: { userId },
    orderBy: { acceptedAt: "desc" },
    take: 20,
  });

  return rows.map(
    (row): ConsentRecord => ({
      id: row.id,
      userId: row.userId,
      consentType: row.consentType as ConsentRecord["consentType"],
      acceptedAt: row.acceptedAt.toISOString(),
      version: row.version,
      textSummary: row.textSummary,
      dataScopes: Array.isArray(row.dataScopes)
        ? (row.dataScopes as string[])
        : [],
      plaidProducts: Array.isArray(row.plaidProducts)
        ? (row.plaidProducts as string[])
        : undefined,
      revokedAt: row.revokedAt?.toISOString(),
    }),
  );
}

export async function createConsentForUser(
  userId: string,
  record: Omit<ConsentRecord, "id" | "userId">,
) {
  const prisma = getPrisma();
  if (!prisma) throw new Error("Database is not configured.");

  return prisma.consentRecord.create({
    data: {
      userId,
      consentType: record.consentType,
      acceptedAt: new Date(record.acceptedAt),
      version: record.version,
      textSummary: record.textSummary,
      dataScopes: record.dataScopes,
      plaidProducts: record.plaidProducts ?? [],
      revokedAt: record.revokedAt ? new Date(record.revokedAt) : null,
    },
  });
}
