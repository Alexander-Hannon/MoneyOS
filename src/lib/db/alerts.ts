import { getPrisma } from "@/lib/db/prisma";

export async function listAlertsForUser(userId: string) {
  const prisma = getPrisma();
  if (!prisma) return [];
  return prisma.moneyAlert.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
}

export async function replaceAlertsForUser(
  userId: string,
  alerts: Record<string, unknown>[],
) {
  const prisma = getPrisma();
  if (!prisma) throw new Error("Database is not configured.");

  await prisma.$transaction(async (tx) => {
    await tx.moneyAlert.deleteMany({ where: { userId } });
    for (const alert of alerts) {
      await tx.moneyAlert.create({
        data: {
          id: alert.id ? String(alert.id) : undefined,
          userId,
          title: String(alert.title ?? "Alert"),
          description: String(alert.description ?? ""),
          severity: String(alert.severity ?? "medium"),
          category: String(alert.category ?? "review"),
          suggestedAction: alert.suggestedAction
            ? String(alert.suggestedAction)
            : null,
          reviewRequired: alert.reviewRequired !== false,
          status: String(alert.status ?? "active"),
        },
      });
    }
  });
}
