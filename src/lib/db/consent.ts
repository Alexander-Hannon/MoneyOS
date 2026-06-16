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

function consentKey(record: {
  consentType: string;
  version: string;
  acceptedAt: string;
}) {
  return `${record.consentType}:${record.version}:${record.acceptedAt}`;
}

/** Import consent records idempotently (skip duplicates by type+version+acceptedAt). */
export async function importConsentRecordsForUser(
  userId: string,
  records: Array<Omit<ConsentRecord, "id" | "userId">>,
): Promise<number> {
  const prisma = getPrisma();
  if (!prisma) throw new Error("Database is not configured.");
  if (records.length === 0) return 0;

  const existing = await prisma.consentRecord.findMany({
    where: { userId },
    select: { consentType: true, version: true, acceptedAt: true },
  });

  const existingKeys = new Set(
    existing.map((row) =>
      consentKey({
        consentType: row.consentType,
        version: row.version,
        acceptedAt: row.acceptedAt.toISOString(),
      }),
    ),
  );

  const toCreate = records.filter(
    (record) => !existingKeys.has(consentKey(record)),
  );

  if (toCreate.length === 0) return 0;

  await prisma.consentRecord.createMany({
    data: toCreate.map((record) => ({
      userId,
      consentType: record.consentType,
      acceptedAt: new Date(record.acceptedAt),
      version: record.version,
      textSummary: record.textSummary,
      dataScopes: record.dataScopes,
      plaidProducts: record.plaidProducts ?? [],
      revokedAt: record.revokedAt ? new Date(record.revokedAt) : null,
    })),
  });

  return toCreate.length;
}
