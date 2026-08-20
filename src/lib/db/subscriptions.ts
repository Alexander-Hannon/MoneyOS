import { getPrisma } from "@/lib/db/prisma";

function parseDate(value: unknown): Date | null {
  if (!value || typeof value !== "string") return null;
  const match = value.slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const [, y, m, d] = match;
  return new Date(Date.UTC(Number(y), Number(m) - 1, Number(d), 12, 0, 0));
}

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
          renewalDate: parseDate(sub.renewalDate),
          lastRenewedAt: parseDate(sub.lastRenewedAt),
          notes: sub.notes ? String(sub.notes) : null,
        },
      });
    }
  });
}
