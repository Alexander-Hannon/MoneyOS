import { getPrisma } from "@/lib/db/prisma";

export async function listIncomeForUser(userId: string) {
  const prisma = getPrisma();
  if (!prisma) return [];
  return prisma.incomeSource.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });
}

export async function replaceIncomeForUser(
  userId: string,
  income: Record<string, unknown>[],
) {
  const prisma = getPrisma();
  if (!prisma) throw new Error("Database is not configured.");

  await prisma.$transaction(async (tx) => {
    await tx.incomeSource.deleteMany({ where: { userId } });
    for (const item of income) {
      await tx.incomeSource.create({
        data: {
          id: item.id ? String(item.id) : undefined,
          userId,
          source: String(item.source ?? "Income"),
          expectedAmount:
            item.expectedAmount == null ? null : Number(item.expectedAmount),
          amountType: String(item.amountType ?? "fixed"),
          frequency: String(item.frequency ?? "monthly"),
          reliability: String(item.reliability ?? "medium"),
          startDate: item.startDate ? new Date(String(item.startDate)) : null,
          nextDate: item.nextDate ? new Date(String(item.nextDate)) : null,
          active: item.active !== false,
          notes: item.notes ? String(item.notes) : null,
        },
      });
    }
  });
}
