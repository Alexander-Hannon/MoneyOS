import { getPrisma } from "@/lib/db/prisma";

export async function listSubscriptionsForUser(userId: string) {
  const prisma = getPrisma();
  if (!prisma) return [];
  return prisma.subscription.findMany({
    where: { userId },
    orderBy: { name: "asc" },
  });
}

export async function replaceSubscriptionsForUser(
  userId: string,
  subscriptions: Record<string, unknown>[],
) {
  const prisma = getPrisma();
  if (!prisma) throw new Error("Database is not configured.");

  await prisma.$transaction(async (tx) => {
    await tx.subscription.deleteMany({ where: { userId } });
    for (const sub of subscriptions) {
      await tx.subscription.create({
        data: {
          id: sub.id ? String(sub.id) : undefined,
          userId,
          name: String(sub.name ?? "Subscription"),
          amount: Number(sub.amount) || 0,
          frequency: String(sub.frequency ?? "monthly"),
          category: String(sub.category ?? "General"),
          status: String(sub.status ?? "keep"),
          renewalDate: sub.renewalDate
            ? new Date(String(sub.renewalDate))
            : null,
          notes: sub.notes ? String(sub.notes) : null,
        },
      });
    }
  });
}
